# HIV-TRACE WASM
A WebAssembly implementation of the HIV-TRACE pipeline. 

Uses [cawlign](https://github.com/veg/cawlign/), [tn93](https://github.com/veg/tn93), [hivcluster-rs](https://github.com/veg/hivcluster-rs), and [hivannotate-rs](https://github.com/veg/hivannotate-rs). Implemented using [Biowasm](https://biowasm.com/) and [WebAssembly](https://webassembly.org/).

## Features

- **HIV-TRACE Pipeline**: Complete end-to-end sequence analysis in the browser
- **Reference Selection**: Choose from multiple references or upload custom reference sequences
- **Network Annotation**: Annotate network nodes with patient attributes and metadata
- **Customizable Parameters**: Adjust distance threshold, overlap, and other pipeline parameters
- **Downloadable Results**: Get results in JSON, FASTA, and CSV formats for further analysis
