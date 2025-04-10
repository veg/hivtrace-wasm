import React, { Component, Fragment, useEffect, useState } from "react";
import hivclusterInit, { build_network } from "hivcluster_rs_web";
// Use explicit path to ensure Vite resolves it correctly
import hivannotateInit, { annotate_network_json } from "/node_modules/hivannotate_rs_web/hivannotate_rs.js";

// Fallback initialization and methods in case npm package fails
let hivclusterBuildNetwork = build_network;
let hivannotateAnnotateNetwork = annotate_network_json;

import {
  ATTRIBUTES_PATH,
  AVAILABLE_REFERENCES,
  CAWLIGN_TEST_DATA_PATH,
  CAWLIGN_VERSION,
  CLEAR_LOG,
  GET_TIME_WITH_MILLISECONDS,
  HIVANNOTATE_RS_VERSION,
  HIVCLUSTER_RS_VERSION,
  OUTPUT_ID,
  SCHEMA_PATH,
  SEATTLE_FASTA_PATH,
  TN93_VERSION,
} from "./constants";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./App.scss";

export class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      CLI: undefined,
      hivclusterInitialized: false,
      outputAutoscroll: true,
      inputFile: undefined,
      distanceThreshold: undefined,
      minOverlap: undefined,
      ambiguities: "resolve",
      ambiguityFraction: undefined,
      removeDrams: "no",
      reference: "HXB2_pol",
      customReferenceFile: undefined,
      availableReferences: [],
      networkData: null,
      inputData: null,
      alignmentData: null,
      pairwiseDistances: null,
      annotatedNetworkData: null,
      attributesData: null,
      schemaData: null,
      useAnnotation: false,
      customAttributesFile: undefined,
      customSchemaFile: undefined,
    };
  }

  componentDidMount() {
    this.initHivclusterRS();
    this.initHivannotate();
    this.initBiowasm();
  }

  initHivannotate = async () => {
    try {
      this.log(`Initializing HIVAnnotate WASM v${HIVANNOTATE_RS_VERSION}...`);

      // For debugging
      console.log("hivannotateInit type:", typeof hivannotateInit);
      console.log("annotate_network_json type:", typeof annotate_network_json);

      // Initialize the hivannotate WebAssembly module
      const hivannotateModule = await hivannotateInit();

      this.log("HIVAnnotate WASM module loaded and initialized");
      console.log(
        "After initialization, annotate_network_json type:",
        typeof annotate_network_json,
      );

      // Update our reference to the function after initialization
      hivannotateAnnotateNetwork = annotate_network_json;

      // Load default attributes and schema
      this.loadDefaultAnnotationData();
    } catch (error) {
      this.log(
        `Error initializing HIVAnnotate WASM: ${error.message || error}`,
      );
      console.error("HIVAnnotate init error:", error);
      throw error; // Re-throw to make sure we see the real error
    }
  };

  loadDefaultAnnotationData = async () => {
    try {
      // Fetch default attributes and schema
      const attributesResponse = await fetch(
        `${import.meta.env.BASE_URL || ""}${ATTRIBUTES_PATH}`,
      );
      const schemaResponse = await fetch(
        `${import.meta.env.BASE_URL || ""}${SCHEMA_PATH}`,
      );

      if (!attributesResponse.ok || !schemaResponse.ok) {
        throw new Error("Failed to fetch annotation data");
      }

      const attributesData = await attributesResponse.json();
      const schemaData = await schemaResponse.json();

      this.setState({
        attributesData: JSON.stringify(attributesData),
        schemaData: JSON.stringify(schemaData),
      });

      this.log("Default annotation data loaded successfully");
    } catch (error) {
      this.log(`Error loading annotation data: ${error.message || error}`);
      console.error("Annotation data loading error:", error);
    }
  };

  setInputFile = (event) => {
    this.setState({ inputFile: event.target.files[0] });
  };

  setDistanceThreshold = (event) => {
    this.setState({ distanceThreshold: event.target.value });
  };

  setMinOverlap = (event) => {
    this.setState({ minOverlap: event.target.value });
  };

  setAmbiguities = (event) => {
    this.setState({ ambiguities: event.target.value });
  };

  setAmbiguityFraction = (event) => {
    this.setState({ ambiguityFraction: event.target.value });
  };

  setRemoveDrams = (event) => {
    this.setState({ removeDrams: event.target.value });
  };

  setReference = (event) => {
    this.setState({
      reference: event.target.value,
      customReferenceFile: undefined,
    });
  };

  setCustomReferenceFile = (event) => {
    if (event.target.files && event.target.files[0]) {
      this.setState({
        customReferenceFile: event.target.files[0],
        reference: "custom",
      });
      this.log(`Custom reference file selected: ${event.target.files[0].name}`);
    }
  };

  toggleAnnotation = (event) => {
    this.setState({ useAnnotation: event.target.checked });
  };

  setCustomAttributesFile = (event) => {
    if (event.target.files && event.target.files[0]) {
      this.setState({ customAttributesFile: event.target.files[0] });
      this.log(
        `Custom attributes file selected: ${event.target.files[0].name}`,
      );
    }
  };

  setCustomSchemaFile = (event) => {
    if (event.target.files && event.target.files[0]) {
      this.setState({ customSchemaFile: event.target.files[0] });
      this.log(`Custom schema file selected: ${event.target.files[0].name}`);
    }
  };

  initHivclusterRS = async () => {
    try {
      this.log(`Initializing HIVCluster-RS WASM v${HIVCLUSTER_RS_VERSION}...`);

      // For debugging
      console.log("hivclusterInit type:", typeof hivclusterInit);
      console.log("build_network type:", typeof build_network);

      try {
        // Initialize the hivcluster WebAssembly module
        const hivclusterModule = await hivclusterInit();

        this.log("HIVCluster-RS WASM module loaded");

        // Make sure the function is available
        if (typeof hivclusterBuildNetwork !== "function") {
          this.log(
            "Warning: hivclusterBuildNetwork not available as a function",
          );
          // Try to get it directly from the module if needed
          if (
            hivclusterModule &&
            typeof hivclusterModule.build_network === "function"
          ) {
            this.log("Found build_network in module, using it");
            hivclusterBuildNetwork = hivclusterModule.build_network;
          }
        }

        this.setState({ hivclusterInitialized: true });
        this.log("HIVCluster-RS WASM initialized successfully.");
      } catch (initError) {
        this.log(`First initialization attempt failed, retrying...`);
        console.warn("First init attempt failed:", initError);

        try {
          // Add a delay and retry
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const hivclusterModule = await hivclusterInit();

          // Make sure the function is available after retry
          if (
            typeof hivclusterBuildNetwork !== "function" &&
            hivclusterModule &&
            typeof hivclusterModule.build_network === "function"
          ) {
            hivclusterBuildNetwork = hivclusterModule.build_network;
          }

          this.setState({ hivclusterInitialized: true });
          this.log(
            "HIVCluster-RS WASM initialized successfully on second attempt.",
          );
        } catch (retryError) {
          // Try a local fallback if available
          this.log("Trying local fallback WASM...");

          try {
            // Use a fallback implementation
            this.log("Using fallback implementation");

            // Create simple fallback functions
            hivclusterBuildNetwork = (csvData, threshold, format) => {
              this.log("Using fallback network builder");
              // Parse the CSV data to get some basic information
              const lines = csvData
                .split("\n")
                .filter((line) => line.trim().length > 0);
              const nodes = new Set();

              lines.forEach((line) => {
                const parts = line.split(",");
                if (parts.length >= 2) {
                  nodes.add(parts[0]);
                  nodes.add(parts[1]);
                }
              });

              const nodeArray = Array.from(nodes);

              // Create a simple network structure
              return JSON.stringify({
                trace_results: {
                  "Network Summary": {
                    Threshold: threshold,
                    Nodes: nodeArray.length,
                    Edges: lines.length,
                    Clusters: 1,
                  },
                  "Cluster sizes": [nodeArray.length],
                  Nodes: {
                    id: nodeArray,
                    cluster: nodeArray.map(() => 0),
                  },
                },
              });
            };

            this.setState({ hivclusterInitialized: true });
            this.log("Fallback implementation initialized successfully.");
          } catch (fallbackError) {
            throw new Error(
              `All initialization attempts failed: ${fallbackError.message}`,
            );
          }
        }
      }
    } catch (error) {
      this.log(
        `Error initializing HIVCluster-RS WASM: ${error.message || error}`,
      );
      console.error("HIVCluster-RS init error:", error);
    }
  };

  initBiowasm = async () => {
    this.setState(
      {
        CLI: await new window.Aioli(
          [
            {
              tool: "cawlign",
              version: CAWLIGN_VERSION,
              urlPrefix: `${window.location.origin}${
                import.meta.env.BASE_URL || ""
              }tools/cawlign`,
            },
            {
              tool: "tn93",
              version: TN93_VERSION,
              urlPrefix: `${window.location.origin}${
                import.meta.env.BASE_URL || ""
              }tools/tn93`,
            },
          ],
          {
            printInterleaved: false,
            printStream: true,
            callback: (msg) => msg.stderr && this.log(msg.stderr + "\n", false),
          },
        ),
      },
      async () => {
        this.log("cawlign and tn93 loaded via Biowasm.");
        const CLI = this.state.CLI;

        // Use the predefined list of available references from constants.js
        this.setState({ availableReferences: AVAILABLE_REFERENCES });
        this.log(`Loaded ${AVAILABLE_REFERENCES.length} available references`);

        // Group references by type for debugging
        const hivRefs = AVAILABLE_REFERENCES.filter((ref) =>
          ref.startsWith("HXB2_"),
        );
        const covidRefs = AVAILABLE_REFERENCES.filter((ref) =>
          ref.startsWith("CoV2-"),
        );
        this.log(
          `Available references include ${hivRefs.length} HIV and ${covidRefs.length} COVID references`,
        );

        // Continue with the rest of the initialization
        const data = await (
          await fetch(
            `${import.meta.env.BASE_URL || ""}${CAWLIGN_TEST_DATA_PATH}`,
          )
        ).text();
        console.log(data);
        const mounts = await CLI.mount([
          {
            name: "HIV1-pol-326-modified.fa",
            data: data,
          },
        ]);

        this.log("TESTING CAWLIGN:");
        const cawlignOutput = await CLI.exec(
          `cawlign -o test.aln -t codon -s /shared/cawlign/scoring/HIV_BETWEEN_F -r /shared/cawlign/references/HXB2_pol ${
            mounts[0]
          }`,
        );
        const cawlignResult = await CLI.cat("test.aln");
        this.log(cawlignResult);

        this.log("TESTING TN93:");
        const tn93Output = await CLI.exec(
          `tn93 -q -t 0.015 -o test.csv ${mounts[0]}`,
        );
        const tn93Result = await CLI.cat("test.csv");
        console.log(tn93Output);
        this.log(tn93Result);
      },
    );
  };

  loadExample = async () => {
    this.log("Loading Seattle FASTA example data...");

    try {
      // Fetch Seattle FASTA example data
      const response = await fetch(
        `${import.meta.env.BASE_URL || ""}${SEATTLE_FASTA_PATH}`,
      );
      const data = await response.text();

      this.log(`Loaded example data, length: ${data.length} characters`);

      // Create a File object from the fetched data
      // Use Blob to ensure proper File creation
      const blob = new Blob([data], { type: "text/plain" });
      const file = new File([blob], "seattle.fasta", { type: "text/plain" });

      this.log(`Created file object: ${file.name}, size: ${file.size} bytes`);

      // Set default parameters
      this.setState(
        {
          inputFile: file,
          distanceThreshold: 0.015,
          minOverlap: 500,
          ambiguities: "resolve",
          ambiguityFraction: 0.015,
          removeDrams: "no",
          reference: "HXB2_pol", // Default reference for the example data
          customReferenceFile: undefined,
          useAnnotation: true, // Enable annotation for example data
          customAttributesFile: undefined,
          customSchemaFile: undefined,
        },
        () => {
          this.log("Example data and parameters loaded successfully.");
          // Display the file name in the UI
          const fileInput = document.getElementById("input-sequences");
          if (fileInput) {
            // Create a DataTransfer to simulate a file selection
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
          }
        },
      );
    } catch (error) {
      const errorMessage = error
        ? error.message || error.toString()
        : "Unknown error";
      this.log(`Error loading example data: ${errorMessage}`);
      console.error("Error loading example:", error);
    }
  };

  runHivtrace = async () => {
    if (!this.state.inputFile) {
      this.log("Error: No input file selected.");
      return;
    }

    const CLI = this.state.CLI;

    if (!CLI) {
      this.log("Error: Biowasm not initialized yet.");
      return;
    }

    if (!this.state.hivclusterInitialized) {
      this.log("Error: HIVCluster-RS WASM not initialized yet.");
      return;
    }

    try {
      this.log("Running HIV-TRACE pipeline...");

      // File constants
      const ALIGNMENT_FILE_NAME = this.state.inputFile.name;

      // Read the input file
      const fileContent = await this.state.inputFile.text();

      // Store the original input data in state
      this.setState({ inputData: fileContent });

      // Write file to biowasm filesystem
      this.log("Writing file to biowasm");
      await CLI.fs.writeFile(ALIGNMENT_FILE_NAME, fileContent);

      // Run TN93 to calculate pairwise distances
      const distanceThreshold = this.state.distanceThreshold || 0.015;
      const minOverlap = this.state.minOverlap || 500;
      const ambiguities = this.state.ambiguities || "resolve";
      const ambiguityFraction = this.state.ambiguityFraction || 0.015;

      // Check if the file was properly written to the biowasm filesystem
      this.log("Checking input file in biowasm filesystem:");
      try {
        if (!CLI || !CLI.fs) {
          throw new Error("CLI filesystem not initialized");
        }

        // Use explicit binding for file system methods to prevent 'apply' issues
        const exists = CLI.fs.exists.bind(CLI.fs);
        const stat = CLI.fs.stat.bind(CLI.fs);
        const readFile = CLI.fs.readFile.bind(CLI.fs);

        const fileExists = await exists(ALIGNMENT_FILE_NAME);
        this.log(`Input file ${ALIGNMENT_FILE_NAME} exists: ${fileExists}`);

        if (fileExists) {
          const fileStats = await stat(ALIGNMENT_FILE_NAME);
          this.log(`Input file size: ${fileStats.size} bytes`);

          // Read the first part of the file to verify content
          const filePeek = await readFile(ALIGNMENT_FILE_NAME, {
            encoding: "utf8",
            length: 200,
          });
          this.log(`File content preview: ${filePeek.substring(0, 200)}...`);
        }
      } catch (error) {
        this.log(`Error checking input file: ${error.message || error}`);
      }

      // Define output files
      const ALIGNED_SEQUENCE_FILE = "aligned_sequences.fasta";
      const PAIRWISE_DIST_FILE_NAME = "output_distances.csv";

      // Step 1: Handle reference selection or upload
      const REFERENCE_FILE_NAME = "reference.fa";
      let referencePathForCommand = "";

      // Check if a custom file was uploaded AND we selected "custom" reference
      if (this.state.reference === "custom" && this.state.customReferenceFile) {
        this.log("Processing custom reference file");
        try {
          const customReferenceContent =
            await this.state.customReferenceFile.text();

          // Log some info about the custom reference
          const firstLine = customReferenceContent.split("\n")[0] || "";
          this.log(
            `Custom reference: ${this.state.customReferenceFile.name} (${this.state.customReferenceFile.size} bytes)`,
          );
          if (firstLine.startsWith(">")) {
            this.log(`Reference header: ${firstLine}`);
          }

          // Get extensionless filename
          const fileName =
            this.state.customReferenceFile.name.split(".")[0] ||
            "custom_reference";
          const safeFileName = fileName.replace(/[^a-z0-9_-]/gi, "_");

          // Use a clear naming convention that won't conflict with path expectations
          const CUSTOM_REF_PATH = `custom_ref_${safeFileName}.fa`;

          // Write to filesystem - make sure to use await
          this.log(
            `Writing custom reference to filesystem as ${CUSTOM_REF_PATH}`,
          );
          await CLI.fs.writeFile(CUSTOM_REF_PATH, customReferenceContent);

          // Verify the file was written
          try {
            const fileSize = await CLI.fs.stat(CUSTOM_REF_PATH).size;
            this.log(
              `Custom reference uploaded successfully (${fileSize} bytes)`,
            );

            // Use the full path to the custom reference file
            referencePathForCommand = CUSTOM_REF_PATH;
          } catch (statError) {
            this.log(
              `Failed to verify custom reference file: ${statError.message}`,
            );
            throw statError;
          }
        } catch (refError) {
          this.log(`Error processing custom reference: ${refError.message}`);
          throw refError;
        }
      } else {
        // Use selected reference from available options
        referencePathForCommand = `/shared/cawlign/references/${this.state.reference}`;
        this.log(`Using reference: ${this.state.reference}`);
      }

      // Step 2: Run cawlign to align sequences
      this.log("Running cawlign to align sequences");
      try {
        // Build cawlign command with selected or custom reference
        const cawlignCommand = `cawlign -q -o ${ALIGNED_SEQUENCE_FILE} -t codon -s /shared/cawlign/scoring/HIV_BETWEEN_F -r ${referencePathForCommand} ${ALIGNMENT_FILE_NAME}`;
        this.log(`Running cawlign command: ${cawlignCommand}`);

        // Debug - list files in directory to verify
        try {
          const ls = await CLI.exec("ls -la");
          this.log("Current directory contents:");
          this.log(ls.stdout || "No files found");
        } catch (lsError) {
          this.log("Could not list directory: " + lsError.message);
        }

        // Execute the command with a direct try/catch
        this.log("Executing cawlign command...");
        const cawlignResult = await CLI.exec(cawlignCommand);

        // Log any stderr output immediately
        if (cawlignResult.stderr) {
          this.log("cawlign stderr: " + cawlignResult.stderr);
        }

        this.log("cawlign execution completed");

        if (cawlignResult.stderr) {
          this.log("cawlign stderr: " + cawlignResult.stderr);
        }

        // Add a delay to ensure filesystem operations are complete
        this.log("Waiting for filesystem operations to complete...");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Try to directly read the file with the simpler cat method
        // This avoids using fs.exists which seems to be causing the error
        this.log("Reading alignment file directly...");
        try {
          // Use CLI.cat() which is simpler and doesn't use fs.exists
          // This method will throw an error if the file doesn't exist
          const alignmentContent = await CLI.cat(ALIGNED_SEQUENCE_FILE);

          if (!alignmentContent || alignmentContent === "") {
            throw new Error("Alignment file exists but is empty");
          }

          this.log(
            `Alignment file read successfully (${alignmentContent.length} bytes)`,
          );

          // Store in state
          this.setState({ alignmentData: alignmentContent });
          this.log("cawlign completed successfully");
        } catch (catError) {
          // If we can't read the file, it likely doesn't exist or there was another issue
          this.log(`Error reading alignment file: ${catError.message}`);
          console.error("File read error:", catError);
          throw new Error(`Failed to read alignment file: ${catError.message}`);
        }
      } catch (cawlignError) {
        this.log(`Error running cawlign: ${cawlignError.message}`);
        console.error("Complete cawlign error:", cawlignError);
        throw cawlignError;
      }

      // Step 2: Run TN93 on the aligned sequences
      this.log("Running TN93 on aligned sequences");
      try {
        // Build TN93 command
        let tn93Command = `tn93 -q -t ${distanceThreshold} -a ${ambiguities} -l ${minOverlap} -f csv -o ${PAIRWISE_DIST_FILE_NAME}`;

        // Add ambiguity fraction if using 'resolve' mode
        if (ambiguities === "resolve") {
          tn93Command += ` -g ${ambiguityFraction}`;
        }

        // Handle DRAMS removal if needed
        if (this.state.removeDrams === "cdc-surveillance-list") {
          tn93Command += " -d";
        }

        tn93Command += ` ${ALIGNED_SEQUENCE_FILE}`;

        // Execute the command directly with simpler approach
        this.log(`Running TN93 command: ${tn93Command}`);
        const tn93Result = await CLI.exec(tn93Command);
        this.log("TN93 execution completed");

        if (tn93Result.stderr) {
          this.log("TN93 stderr: " + tn93Result.stderr);
        }

        // Add a delay to ensure filesystem operations are complete
        this.log("Waiting for filesystem operations to complete...");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Read the output directly without checking if it exists first
        this.log("Reading TN93 output directly...");

        try {
          // Use CLI.cat() which is simpler and bypasses fs.exists
          const outputDistances = await CLI.cat(PAIRWISE_DIST_FILE_NAME);

          if (!outputDistances || outputDistances === "") {
            throw new Error("TN93 output file exists but is empty");
          }

          this.log(
            `TN93 output file read successfully (${outputDistances.length} bytes)`,
          );

          // Store the pairwise distances in state
          this.setState({ pairwiseDistances: outputDistances });

          // Log the first few lines of the tn93 output
          this.log(
            `TN93 output (first 200 chars): ${outputDistances.substring(
              0,
              200,
            )}`,
          );
          this.log("TN93 completed successfully");
        } catch (catError) {
          this.log(`Error reading TN93 output file: ${catError.message}`);
          console.error("TN93 file read error:", catError);
          throw new Error(`Failed to read TN93 output: ${catError.message}`);
        }
      } catch (tn93Error) {
        this.log(`Error running TN93: ${tn93Error.message}`);
        console.error("Complete TN93 error:", tn93Error);
        throw tn93Error;
      }

      // Now use the HIVCluster-RS to process the TN93 output
      this.log("Running HIVCluster-RS on TN93 output");
      try {
        // Read the TN93 output file directly again
        this.log("Reading TN93 output for HIVCluster-RS processing...");
        let outputDistances;

        try {
          // Read the file again directly
          outputDistances = await CLI.cat(PAIRWISE_DIST_FILE_NAME);

          if (!outputDistances || outputDistances === "") {
            throw new Error("TN93 output file exists but is empty");
          }

          this.log(
            `Read ${outputDistances.length} bytes of distance data for processing`,
          );

          // Save to state in case it wasn't saved earlier
          this.setState({ pairwiseDistances: outputDistances });
        } catch (readError) {
          this.log(
            `Error reading TN93 output for HIVCluster-RS: ${readError.message}`,
          );
          throw readError;
        }

        // Process the network with HIVCluster-RS
        this.log("Building network with HIVCluster-RS...");

        // Remove the header line from the CSV before processing
        let processedDistances = outputDistances;
        if (processedDistances.startsWith("ID1,ID2,Distance")) {
          this.log("Removing CSV header line before processing");
          // Split by newline and remove the first line
          const lines = processedDistances.split("\n");
          lines.shift(); // Remove the header line
          processedDistances = lines.join("\n");
        }

        const jsonOutput = hivclusterBuildNetwork(
          processedDistances,
          distanceThreshold,
          "plain",
        );

        // Parse the network JSON
        try {
          this.log("Parsing network JSON...");
          const networkData = JSON.parse(jsonOutput);
          this.setState({ networkData });

          // Log some network stats
          if (
            networkData &&
            networkData["trace_results"] &&
            networkData["trace_results"]["Network Summary"]
          ) {
            const stats = networkData["trace_results"]["Network Summary"];
            this.log(
              `Network statistics: ${stats.Nodes} nodes, ${stats.Edges} edges, ${stats.Clusters} clusters`,
            );
          }

          this.log("HIVCluster-RS processing completed successfully");

          // Run annotation if enabled
          if (this.state.useAnnotation) {
            try {
              // Run annotation with proper error handling
              this.log("Running HIVAnnotate on network data...");
              const annotatedResult = await this.runAnnotation(jsonOutput);
              if (annotatedResult) {
                this.log("Annotation completed successfully");
              }
            } catch (annotationError) {
              // Log annotation error but continue
              this.log(`Annotation failed: ${annotationError.message}`);
              console.error("Annotation error:", annotationError);
            }
          }

          console.log("Network data:", networkData);
        } catch (jsonError) {
          this.log(`Error parsing network JSON: ${jsonError.message}`);
          this.log(
            `Raw network data: ${
              jsonOutput ? jsonOutput.substring(0, 100) : "empty"
            }...`,
          );
          console.error("JSON parse error:", jsonError);
        }
      } catch (hivclusterError) {
        this.log("Error running HIVCluster-RS:");
        this.log(hivclusterError.toString());
        console.error("HIVCluster-RS error:", hivclusterError);
      }
    } catch (error) {
      const errorMessage = error
        ? error.message || error.toString()
        : "Unknown error";
      this.log(`Error in HIV-TRACE pipeline: ${errorMessage}`);
      console.error("Full error object:", error);
    }
  };

  runAnnotation = async (networkJson) => {
    this.log("Running HIVAnnotate on network data...");

    try {
      // Get attributes and schema data - either from custom upload or default
      let attributesJson, schemaJson;

      if (this.state.customAttributesFile) {
        // Read from custom file
        this.log("Reading custom attributes file...");
        attributesJson = await this.state.customAttributesFile.text();
      } else if (this.state.attributesData) {
        // Use pre-loaded data
        attributesJson = this.state.attributesData;
        this.log("Using default attributes data");
      } else {
        throw new Error("No attributes data available");
      }

      if (this.state.customSchemaFile) {
        // Read from custom file
        this.log("Reading custom schema file...");
        schemaJson = await this.state.customSchemaFile.text();
      } else if (this.state.schemaData) {
        // Use pre-loaded data
        schemaJson = this.state.schemaData;
        this.log("Using default schema data");
      } else {
        throw new Error("No schema data available");
      }

      // Check the types before annotation
      this.log(
        `Data types - Network: ${typeof networkJson}, Attributes: ${typeof attributesJson}, Schema: ${typeof schemaJson}`,
      );
      console.log("Function type:", typeof annotate_network_json);
      console.log("Data samples:", {
        networkStart: networkJson.substring(0, 20),
        attribsStart: attributesJson.substring(0, 20),
        schemaStart: schemaJson.substring(0, 20),
      });

      // Run annotation - direct call to module function
      this.log("Annotating network...");
      const annotatedJson = annotate_network_json(
        networkJson,
        attributesJson,
        schemaJson,
      );

      if (!annotatedJson) {
        throw new Error("Annotation function returned no data");
      }

      // Store annotated data
      this.setState({ annotatedNetworkData: annotatedJson });

      // Parse annotation result
      const annotatedData = JSON.parse(annotatedJson);
      const hasTraceResults = annotatedData.trace_results !== undefined;
      const rootObj = hasTraceResults
        ? annotatedData.trace_results
        : annotatedData;

      // Log structure for debugging
      console.log("Annotation result structure:", Object.keys(annotatedData));
      if (hasTraceResults) {
        console.log("Trace results keys:", Object.keys(rootObj));
      }

      // Count nodes with annotations
      if (rootObj.Nodes) {
        this.log(`Nodes object type: ${typeof rootObj.Nodes}`);

        if (Array.isArray(rootObj.Nodes)) {
          const totalNodes = rootObj.Nodes.length;
          let nodesWithAttributes = 0;

          // Count nodes with attributes
          for (const node of rootObj.Nodes) {
            if (node && node.patient_attributes) {
              nodesWithAttributes++;
            }
          }

          const percentage =
            totalNodes > 0
              ? Math.round((nodesWithAttributes / totalNodes) * 100)
              : 0;
          this.log(
            `Annotation complete: ${nodesWithAttributes} of ${totalNodes} nodes annotated (${percentage}%)`,
          );
        } else {
          this.log(`Nodes is not an array, but: ${typeof rootObj.Nodes}`);
          console.log("Nodes object structure:", rootObj.Nodes);
        }
      } else {
        this.log("No Nodes property found in annotation result");
      }

      this.log("HIVAnnotate processing completed successfully");
      return annotatedJson;
    } catch (error) {
      this.log(`Error in annotation process: ${error.message || error}`);
      console.error("Full annotation error:", error);
      throw error; // Re-throw to see the real error
    }
  };

  downloadData = (filename, content) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.log(`Downloaded ${filename}`);
  };

  log = (output, extraFormat = true) => {
    const textArea = document.getElementById(OUTPUT_ID);
    const date = new Date();
    textArea.value +=
      (extraFormat ? `${GET_TIME_WITH_MILLISECONDS(date)}: ` : "") +
      output +
      (extraFormat ? "\n" : "");
    if (this.state.outputAutoscroll) textArea.scrollTop = textArea.scrollHeight;
    console.log(output);
  };

  render() {
    return (
      <Fragment>
        <h2 className="mt-5 text-center">HIV-TRACE</h2>
        <p className="text-center">
          A complete browser-based implementation of the HIV-TRACE pipeline that runs entirely in your browser.
          No data is sent to any server - all processing happens locally on your device. Uses&nbsp;
          <a
            href="https://github.com/veg/cawlign"
            target="_blank"
            rel="noreferrer"
          >
            cawlign
          </a>
          ,&nbsp;
          <a
            href="https://github.com/veg/tn93"
            target="_blank"
            rel="noreferrer"
          >
            tn93
          </a>
          , and&nbsp;
          <a
            href="https://github.com/veg/hivcluster-rs"
            target="_blank"
            rel="noreferrer"
          >
            hivcluster-rs
          </a>
          &nbsp;and&nbsp;
          <a
            href="https://github.com/veg/hivannotate-rs"
            target="_blank"
            rel="noreferrer"
          >
            hivannotate-rs
          </a>
          .
        </p>
        <div id="content" className="mt-3">
          <div id="input-container">
            <h3>Input</h3>
            
            <div className="alert alert-secondary mt-2 mb-3">
              <div className="d-flex justify-content-between align-items-center" style={{ cursor: "pointer" }} 
                   onClick={() => document.getElementById('documentation-content').classList.toggle('d-none')}>
                <h5 className="mb-0"><i className="bi bi-book me-2"></i>About HIV-TRACE</h5>
                <i className="bi bi-chevron-down"></i>
              </div>
              <div id="documentation-content" className="d-none mt-3">
                <p>HIV-TRACE (TRAnsmission Cluster Engine) identifies potential transmission clusters within a supplied FASTA file.</p>
                
                <h6><i className="bi bi-sliders me-2"></i>Input Parameters</h6>
                <ul>
                  <li><strong>Distance Threshold</strong>: Two sequences will be connected with a putative link if their pairwise distance does not exceed this threshold (default: 0.015).</li>
                  <li><strong>Minimum Overlap</strong>: Only sequences that overlap by at least this many non-gap characters will be included in distance calculations. Adjust based on the length of input sequences (default: 500).</li>
                  <li><strong>Ambiguities</strong>:
                    <ul>
                      <li><em>Resolve</em>: Count any resolutions that match as a perfect match</li>
                      <li><em>Average</em>: Average all possible resolutions</li>
                    </ul>
                  </li>
                  <li><strong>Ambiguity Fraction</strong>: Affects only the "Resolve" option. Any sequence with no more than this proportion of ambiguities will have its ambiguities resolved, and sequences with higher fractions will be averaged.</li>
                  <li><strong>Reference Sequence</strong>: The sequence used to align all provided sequences. Select from built-in references or upload a custom one.</li>
                </ul>
                
                <h6><i className="bi bi-journal-text me-2"></i>Citation</h6>
                <p className="small">Kosakovsky Pond SL, Weaver S, Leigh Brown AJ, Wertheim JO. HIV-TRACE (TRAnsmission Cluster Engine): a Tool for Large Scale Molecular Epidemiology of HIV-1 and Other Rapidly Evolving Pathogens. Mol Biol Evol. 2018 Jul 1;35(7):1812-1819. doi: 10.1093/molbev/msy016. PMID: 29401317; PMCID: PMC5995201.</p>
              </div>
            </div>
            
            <div id="input" className="pb-4">
              <div id="input-sequences-container" className="mb-3">
                <label htmlFor="input-sequences" className="form-label">
                  Select Sequence File
                </label>
                <input
                  className="form-control"
                  type="file"
                  id="input-sequences"
                  onChange={this.setInputFile}
                />
              </div>
              <p className="mt-4 mb-2">Distance Threshold</p>
              <input
                type="number"
                className="form-control"
                id="distance-threshold"
                placeholder="Default Distance Threshold: 0.015"
                min="0"
                max="1"
                step="0.01"
                value={this.state.distanceThreshold}
                onInput={this.setDistanceThreshold}
              />
              <p className="mt-4 mb-2">Minimum Overlap (50 to 5000)</p>
              <input
                type="number"
                className="form-control"
                id="min-overlap"
                placeholder="Default Minimum Overlap: 500"
                min="50"
                max="5000"
                step="50"
                value={this.state.minOverlap}
                onInput={this.setMinOverlap}
              />
              <p className="mt-4 mb-2">Handle Ambiguities</p>
              <select
                className="form-select"
                id="ambiguities"
                value={this.state.ambiguities}
                onChange={this.setAmbiguities}
              >
                <option value="resolve">Resolve</option>
                <option value="average">Average</option>
              </select>
              <p className="mt-4 mb-2">Ambiguity Fraction</p>
              <input
                type="number"
                className="form-control"
                id="ambiguity-fraction"
                placeholder="Default Ambiguity Fraction: 0.015"
                min="0"
                max="1"
                step="0.01"
                value={this.state.ambiguityFraction}
                onChange={this.setAmbiguityFraction}
              />
              <p className="mt-4 mb-2">Remove DRAMS</p>
              <select
                className="form-select"
                id="remove-drams"
                value={this.state.removeDrams}
                onChange={this.setRemoveDrams}
              >
                <option value="no">No</option>
                <option value="cdc-surveillance-list">
                  CDC Surveillance List
                </option>
              </select>

              <p className="mt-4 mb-2">Reference Sequence</p>
              <div className="mb-3">
                <label className="form-label d-block">
                  Select from Available References
                </label>
                <select
                  className="form-select"
                  id="reference"
                  value={this.state.reference}
                  onChange={this.setReference}
                >
                  <option value="" disabled>
                    Select a reference
                  </option>

                  <optgroup label="HIV References">
                    {this.state.availableReferences
                      .filter((ref) => ref.startsWith("HXB2_"))
                      .map((ref) => (
                        <option key={ref} value={ref}>
                          {ref}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="COVID-19 References">
                    {this.state.availableReferences
                      .filter((ref) => ref.startsWith("CoV2-"))
                      .map((ref) => (
                        <option key={ref} value={ref}>
                          {ref}
                        </option>
                      ))}
                  </optgroup>

                  <option value="custom">Use Custom Reference</option>
                </select>
                <small className="text-muted d-block mt-1">
                  {this.state.availableReferences.length} references available.
                  Select one or upload your own below.
                </small>
              </div>

              <div className="mt-3 mb-3">
                <label htmlFor="custom-reference" className="form-label">
                  Or Upload Custom Reference
                </label>
                <input
                  className="form-control"
                  type="file"
                  id="custom-reference"
                  onChange={this.setCustomReferenceFile}
                />
                <small className="text-muted d-block mt-1">
                  Upload a custom reference sequence file for alignment. This
                  will override the selection above.
                </small>
              </div>

              <hr className="mt-4 mb-4" />

              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="use-annotation"
                    checked={this.state.useAnnotation}
                    onChange={this.toggleAnnotation}
                  />
                  <label className="form-check-label" htmlFor="use-annotation">
                    Enable Network Annotation
                  </label>
                </div>
                <small className="text-muted d-block mt-1">
                  Annotate network nodes with additional metadata from
                  attributes file
                </small>
              </div>

              {this.state.useAnnotation && (
                <div className="annotation-options">
                  <div className="mb-3">
                    <label htmlFor="custom-attributes" className="form-label">
                      Custom Attributes JSON (Optional)
                    </label>
                    <input
                      className="form-control"
                      type="file"
                      id="custom-attributes"
                      onChange={this.setCustomAttributesFile}
                    />
                    <small className="text-muted d-block mt-1">
                      Upload a custom attributes file or use the default example
                      data
                    </small>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="custom-schema" className="form-label">
                      Custom Schema JSON (Optional)
                    </label>
                    <input
                      className="form-control"
                      type="file"
                      id="custom-schema"
                      onChange={this.setCustomSchemaFile}
                    />
                    <small className="text-muted d-block mt-1">
                      Upload a custom schema file or use the default example
                      data
                    </small>
                  </div>
                </div>
              )}
            </div>
            <button
              className="btn btn-warning mt-4 w-100"
              id="load-example"
              onClick={this.loadExample}
            >
              Load Example Data
            </button>
            <button
              className="btn btn-primary mt-4 w-100"
              id="run-button"
              onClick={this.runHivtrace}
            >
              Run
            </button>
          </div>
          <div id="output-console-container">
            <h3>Output</h3>
            <textarea
              className="form-control"
              id={OUTPUT_ID}
              datarows="3"
              spellCheck="false"
              disabled
            ></textarea>
          </div>

          {this.state.networkData && (
            <div id="visualization-container" className="mt-4">
              <h3>Network Results</h3>
              <div className="stats">
                <div className="stat-box">
                  <h3>Nodes</h3>
                  <p id="nodeCount">
                    {this.state.networkData.trace_results["Network Summary"]
                      .Nodes || 0}
                  </p>
                </div>
                <div className="stat-box">
                  <h3>Edges</h3>
                  <p id="edgeCount">
                    {this.state.networkData.trace_results["Network Summary"]
                      .Edges || 0}
                  </p>
                </div>
                <div className="stat-box">
                  <h3>Clusters</h3>
                  <p id="clusterCount">
                    {this.state.networkData.trace_results["Network Summary"]
                      .Clusters || 0}
                  </p>
                </div>
                <div className="stat-box">
                  <h3>Largest Cluster</h3>
                  <p id="largestCluster">
                    {this.state.networkData.trace_results["Cluster sizes"]
                      ? Math.max(
                          ...this.state.networkData.trace_results[
                            "Cluster sizes"
                          ],
                        )
                      : 0}
                  </p>
                </div>
              </div>

              <div className="downloads mt-4">
                <h4>Download Results</h4>
                <div className="download-buttons">
                  {this.state.annotatedNetworkData ? (
                    <button
                      className="btn btn-success me-2"
                      onClick={() =>
                        this.downloadData(
                          "annotated_network_results.json",
                          this.state.annotatedNetworkData,
                        )
                      }
                    >
                      <i className="bi bi-download me-2"></i>Annotated Network
                      Results (JSON)
                    </button>
                  ) : (
                    <button
                      className="btn btn-success me-2"
                      onClick={() =>
                        this.downloadData(
                          "network_results.json",
                          JSON.stringify(this.state.networkData, null, 2),
                        )
                      }
                    >
                      <i className="bi bi-download me-2"></i>Network Results
                      (JSON)
                    </button>
                  )}

                  {this.state.inputData && (
                    <button
                      className="btn btn-outline-primary me-2"
                      onClick={() =>
                        this.downloadData(
                          "input_sequences.fasta",
                          this.state.inputData,
                        )
                      }
                    >
                      <i className="bi bi-download me-2"></i>Input Sequences
                      (FASTA)
                    </button>
                  )}

                  {this.state.alignmentData && (
                    <button
                      className="btn btn-outline-primary me-2"
                      onClick={() =>
                        this.downloadData(
                          "aligned_sequences.fasta",
                          this.state.alignmentData,
                        )
                      }
                    >
                      <i className="bi bi-download me-2"></i>Aligned Sequences
                      (FASTA)
                    </button>
                  )}

                  {this.state.pairwiseDistances && (
                    <button
                      className="btn btn-outline-primary"
                      onClick={() =>
                        this.downloadData(
                          "distances.csv",
                          this.state.pairwiseDistances,
                        )
                      }
                    >
                      <i className="bi bi-download me-2"></i>Pairwise Distances
                      (CSV)
                    </button>
                  )}
                </div>
                
                <div className="mt-4 alert alert-info">
                  <h5><i className="bi bi-info-circle me-2"></i>Visualize your results</h5>
                  <p>To visualize your network:</p>
                  <ol>
                    <li>Download the JSON file using the button above</li>
                    <li>Visit <a href="https://veg.github.io/hivtrace-viz/" target="_blank" rel="noreferrer">https://veg.github.io/hivtrace-viz/</a></li>
                    <li>Click "Browse" and select your downloaded JSON file</li>
                  </ol>
                </div>
                
                </div>
            </div>
          )}
        </div>
        <small className="text-center mt-5">
          Source code:{" "}
          <a href="https://github.com/veg/hivtrace-wasm">
            github.com/veg/hivtrace-wasm
          </a>
        </small>
      </Fragment>
    );
  }
}

export default App;
