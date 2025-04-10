# HIV-TRACE WASM
A WebAssembly implementation of the HIV-TRACE pipeline. 

Uses [cawlign](https://github.com/veg/cawlign/), [tn93](https://github.com/veg/tn93), [hivcluster-rs](https://github.com/veg/hivcluster-rs), and [hivannotate-rs](https://github.com/veg/hivannotate-rs). Implemented using [Biowasm](https://biowasm.com/) and [WebAssembly](https://webassembly.org/).

## Features

- **HIV-TRACE Pipeline**: Complete end-to-end sequence analysis in the browser
- **Reference Selection**: Choose from multiple references or upload custom reference sequences
- **Network Annotation**: Annotate network nodes with patient attributes and metadata
- **Customizable Parameters**: Adjust distance threshold, overlap, and other pipeline parameters
- **Downloadable Results**: Get results in JSON, FASTA, and CSV formats for further analysis

## Related Tools

- **Python Implementation**: For the original Python implementation of HIV-TRACE, visit [github.com/veg/hivtrace](https://github.com/veg/hivtrace)
- **AUTO-TUNE**: A tool for selecting the optimal distance threshold for HIV transmission clusters available at [autotune.datamonkey.org](https://autotune.datamonkey.org)
  - *Reference*: Weaver S, Dávila Conn VM, Ji D, Verdonk H, Ávila-Ríos S, Leigh Brown AJ, Wertheim JO and Kosakovsky Pond SL (2024) AUTO-TUNE: selecting the distance threshold for inferring HIV transmission clusters. Front. Bioinform. 4:1400003. doi: 10.3389/fbinf.2024.1400003
- **COVFEFE**: A tool for evaluating HIV genetic networks at [covfefe.datamonkey.org](https://covfefe.datamonkey.org)
