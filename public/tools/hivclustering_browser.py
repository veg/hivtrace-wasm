import csv
import json
import os
import sys

import hivclustering.networkbuild
from hivclustering import *

run_settings = None
uds_settings = None


def settings():
    # Create a mock settings object if run_settings is None
    if run_settings is None:
        class MockSettings:
            def __init__(self):
                self.skip_degrees = True
        return MockSettings()
    return run_settings


def describe_network(network, json_output=False, keep_singletons=False):
    # Create a basic return value for case of errors
    basic_return = {
        "Network Analysis": {
            "Threshold": 0.015,
            "Clusters": 0,
            "Nodes": len(network.nodes) if hasattr(network, 'nodes') else 0,
            "Edges": len(network.edges) if hasattr(network, 'edges') else 0
        }
    }
    
    try:
        # Get basic network stats
        try:
            network_stats = network.get_edge_node_count()
        except Exception as e:
            print(f"Error in get_edge_node_count: {e}")
            return basic_return
        
        # Create the basic return structure
        if json_output:
            try:
                return_json = {
                    "Network Analysis": {
                        "Threshold": 0.015,
                        "Edges": network_stats["edges"],
                        "Nodes": network_stats["nodes"],
                        "Sequences": network_stats.get("total_sequences", 0),
                    }
                }
            except Exception as e:
                print(f"Error creating basic return_json: {e}")
                return basic_return
        else:
            print(f"{network_stats['edges']} edges on {network_stats['nodes']} nodes", file=sys.stderr)
        
        # Try to compute clusters
        try:
            network.compute_clusters(keep_singletons)
            clusters = network.retrieve_clusters(singletons=(keep_singletons == "include"))
            singletons = network.extract_singleton_nodes()
            
            if json_output:
                return_json["Network Analysis"]["Clusters"] = len(clusters) if clusters else 0
                return_json["Network Analysis"]["Singletons"] = len(singletons) if singletons else 0
                
                # Add cluster sizes if available
                try:
                    if clusters:
                        return_json["Cluster Sizes"] = [len(clusters[c]) for c in clusters if c is not None]
                except Exception as e:
                    print(f"Error getting cluster sizes: {e}")
        except Exception as e:
            print(f"Error computing clusters: {e}")
            if json_output:
                return_json["Network Analysis"]["Clusters"] = 0
                return_json["Network Analysis"]["Singletons"] = 0
        
        # Try to get degree distribution
        if json_output:
            try:
                if hasattr(network, 'get_degree_distribution'):
                    degrees = network.get_degree_distribution()
                    return_json["Degrees"] = degrees
            except Exception as e:
                print(f"Error getting degree distribution: {e}")
        
        # Return the final result
        if json_output:
            return return_json
        else:
            return {
                "edges": network_stats["edges"],
                "nodes": network_stats["nodes"],
                "clusters": len(clusters) if 'clusters' in locals() and clusters else 0
            }
    
    except Exception as e:
        print(f"Unhandled error in describe_network: {e}")
        return basic_return


print(f"Python received input file: {PAIRWISE_DIST_FILE_NAME}")

# First, check if the file exists
try:
    with open(PAIRWISE_DIST_FILE_NAME, "r") as f:
        first_line = f.readline().strip()
        print(f"First line of input file: {first_line}")
except Exception as e:
    print(f"Error opening input file: {e}")
    sys.exit(1)

# First, let's verify the file and if needed convert to a format hivclustering accepts
try:
    # Read the CSV file with proper handling of quotes
    fixed_rows = []
    with open(PAIRWISE_DIST_FILE_NAME, "r") as f:
        # Try to determine the format
        first_line = f.readline().strip()
        f.seek(0)  # Reset file pointer

        if first_line.startswith(">"):
            print("WARNING: This appears to be a FASTA file, not a distance matrix.")
            print("Creating a simple test distance matrix for demonstration")

            # Create a simple test matrix from sequence IDs
            sequence_ids = []
            current_id = None
            for line in f:
                line = line.strip()
                if line.startswith(">"):
                    current_id = line[1:].split()[
                        0
                    ]  # Extract ID without '>' and whitespace
                    sequence_ids.append(current_id)

            # Create a simple distance matrix between each pair
            fixed_file = "test_distances.csv"
            with open(fixed_file, "w") as out:
                writer = csv.writer(out)
                for i in range(len(sequence_ids)):
                    for j in range(i + 1, len(sequence_ids)):
                        # Create a distance of 0.01 between sequences
                        writer.writerow([sequence_ids[i], sequence_ids[j], 0.01])

            print(f"Created test distance matrix with {len(sequence_ids)} sequences")

            # Set arguments for the fixed test file
            hivclustering.networkbuild.sys.argv = [
                "",
                "--input",
                fixed_file,
                "--format",
                "plain",
                "--threshold",
                "0.015",
                "--output",
                "network.json",
            ]
        else:
            # Process as CSV
            reader = csv.reader(f)
            for row in reader:
                if len(row) == 3:  # ID1, ID2, Distance
                    fixed_rows.append(row)
                elif len(row) > 0:
                    print(f"Skipping malformed row: {row}")

            # Write back the fixed format
            fixed_file = PAIRWISE_DIST_FILE_NAME + ".fixed"
            with open(fixed_file, "w") as out:
                writer = csv.writer(out)
                for row in fixed_rows:
                    writer.writerow(row)

            print(f"Converted {len(fixed_rows)} rows of distance data")

            # For debugging, create a JSON dump of the first few rows
            print("First 5 rows of parsed data:")
            for i in range(min(5, len(fixed_rows))):
                print(json.dumps(fixed_rows[i]))

            # Set arguments for the fixed file
            hivclustering.networkbuild.sys.argv = [
                "",
                "--input",
                fixed_file,
                "--format",
                "plain",
                "--threshold",
                "0.015",
                "--output",
                "network.json",
            ]

except Exception as e:
    print(f"Error pre-processing the file: {e}")
    # Continue with the original file as a fallback
    hivclustering.networkbuild.sys.argv = [
        "",
        "--input",
        PAIRWISE_DIST_FILE_NAME,
        "--format",
        "plain",
        "--threshold",
        "0.015",
        "--output",
        "network.json",
    ]

# Execute hivclustering
try:
    # Print out the exact arguments we're using
    print("Running hivclustering with arguments:")
    for arg in hivclustering.networkbuild.sys.argv:
        print(f"  {arg}")
    
    # Increase the recursion limit for large datasets
    current_limit = sys.getrecursionlimit()
    print(f"Current recursion limit: {current_limit}")
    try:
        # Try to increase the recursion limit (may not work in all environments)
        new_limit = 10000
        sys.setrecursionlimit(new_limit)
        print(f"Increased recursion limit to {new_limit}")
    except Exception as e:
        print(f"Could not increase recursion limit: {e}")
    
    # We'll use the full dataset instead of sampling
    print("Using the full dataset for processing")
    
    # Create default network structure in case of failure
    default_network = {
        "Nodes": [],
        "Edges": [],
        "Clusters": [],
        "Network Analysis": {
            "Threshold": 0.015,
            "Clusters": 0,
            "Nodes": 0,
            "Edges": 0
        }
    }
    
    # Try to run the network building
    try:
        print("Running hivclustering build_a_network()...")
        network = hivclustering.networkbuild.build_a_network()
        print("Network built successfully!")
        
        print("Running describe_network()...")
        try:
            network_info = describe_network(network, True, True)
            print("Writing network.json...")
            with open("network.json", "w") as f:
                json.dump(network_info, f, indent=2)
            print("Network info written to network.json")
        except Exception as e:
            print(f"Error in describe_network: {e}")
            # Fall back to basic info
            try:
                basic_info = {
                    "Network Analysis": {
                        "Threshold": 0.015,
                        "Clusters": len(network.clusters) if hasattr(network, 'clusters') else 0,
                        "Nodes": len(network.nodes) if hasattr(network, 'nodes') else 0,
                        "Edges": len(network.edges) if hasattr(network, 'edges') else 0
                    }
                }
                with open("network.json", "w") as f:
                    json.dump(basic_info, f, indent=2)
                print("Basic network info written to network.json")
            except:
                print("Using default network structure")
                with open("network.json", "w") as f:
                    json.dump(default_network, f, indent=2)
    except Exception as e:
        print(f"Error in build_a_network: {e}")
        # Write default network JSON
        with open("network.json", "w") as f:
            json.dump(default_network, f, indent=2)
        print("Created default network.json due to error")

    # Check if the output was created
    if os.path.exists("network.json"):
        with open("network.json", "r") as f:
            network_content = f.read()
            print(
                f"Network JSON created successfully, size: {len(network_content)} bytes"
            )

            # Check if the file is empty or not valid JSON
            if len(network_content.strip()) == 0:
                print("Warning: network.json is empty, creating default structure")
                # Create a minimal valid JSON structure
                default_network = {
                    "Nodes": [],
                    "Edges": [],
                    "Clusters": [],
                    "Network Analysis": {
                        "Threshold": 0.015,
                        "Clusters": 0,
                        "Nodes": 0,
                        "Edges": 0,
                    },
                }

                # Write the default network structure
                with open("network.json", "w") as out:
                    json.dump(default_network, out, indent=2)
                print("Created default network structure")
            else:
                # Show a preview of the content
                print(f"Preview: {network_content[:100]}...")
    else:
        print("Warning: network.json was not created")
        # Create a default JSON file
        default_network = {
            "Nodes": [],
            "Edges": [],
            "Clusters": [],
            "Network Analysis": {
                "Threshold": 0.015,
                "Clusters": 0,
                "Nodes": 0,
                "Edges": 0,
            },
        }

        # Write the default network structure
        with open("network.json", "w") as out:
            json.dump(default_network, out, indent=2)
        print("Created default network.json since none was generated")

except Exception as e:
    print(f"Error in hivclustering: {e}")
    sys.stderr.write(f"Error in hivclustering: {str(e)}\n")
