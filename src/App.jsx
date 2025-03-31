import React, { Component, Fragment } from "react";

import {
  CAWLIGN_VERSION,
  TN93_VERSION,
  OUTPUT_ID,
  GET_TIME_WITH_MILLISECONDS,
  CAWLIGN_TEST_DATA_PATH,
  CLEAR_LOG,
} from "./constants";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./App.scss";

export class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      CLI: undefined,
      pyodide: undefined,

      outputAutoscroll: true,
      inputFile: undefined,
      distanceThreshold: undefined,
      minOverlap: undefined,
      ambiguities: "resolve",
    };
  }

  componentDidMount() {
    this.initPyodide();
    this.initBiowasm();
  }

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

  initPyodide = async () => {
    const pyodide = await loadPyodide({
      stdout: (text) => {
        this.log("STDOUT: " + text + "\n", false);
      },
      stderr: (text) => {
        this.log("STDERR: " + text + "\n", false);
      },
    });
    this.setState({ pyodide });
    this.log("Pyodide loaded.");
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await micropip.install("hivclustering");
    this.log("hivclustering installed on Pyodide.");
  };

  initBiowasm = async () => {
    this.setState(
      {
        CLI: await new window.Aioli(
          [
            {
              tool: "cawlign",
              version: CAWLIGN_VERSION,
              urlPrefix: `${window.location.origin}${import.meta.env.BASE_URL || ""}tools/cawlign`,
            },
            {
              tool: "tn93",
              version: TN93_VERSION,
              urlPrefix: `${window.location.origin}${import.meta.env.BASE_URL || ""}tools/tn93`,
            },
          ],
          {
            printInterleaved: false,
            printStream: true,
            callback: (msg) => msg.stderr && this.log(msg.stderr + "\n", false),
          }
        ),
      },
      async () => {
        this.log("cawlign and tn93 loaded via Biowasm.");
        const CLI = this.state.CLI;
        const data = await (await fetch(`${import.meta.env.BASE_URL || ""}${CAWLIGN_TEST_DATA_PATH}`)).text();
        console.log(data);
        const mounts = await CLI.mount([{ name: "HIV1-pol-326-modified.fa", data: data }]);

        this.log("TESTING CAWLIGN:");
        const cawlignOutput = await CLI.exec(`cawlign -o test.aln -r /shared/cawlign/references/HXB2_pol ${mounts[0]}`);
        const cawlignResult = await CLI.cat("test.aln");
        this.log(cawlignResult);

        this.log("TESTING TN93:");
        const tn93Output = await CLI.exec(`tn93 -t 0.015 -o test.csv ${mounts[0]}`);
        const tn93Result = await CLI.cat("test.csv");
        console.log(tn93Output);
        this.log(tn93Result);
      }
    );
  };

  loadExample = async () => {
    // TODO: Implement
  }

  runHivtrace = async () => {
    // TODO: Implement
  }

  log = (output, extraFormat = true) => {
    const textArea = document.getElementById(OUTPUT_ID);
    const date = new Date();
    textArea.value += (extraFormat ? `${GET_TIME_WITH_MILLISECONDS(date)}: ` : "") + output + (extraFormat ? "\n" : "");
    if (this.state.outputAutoscroll) textArea.scrollTop = textArea.scrollHeight;
    console.log(output);
  };

  render() {
    return (
      <Fragment>
        <h2 className="mt-5 text-center">HIV-TRACE WASM</h2>
        <p className="text-center">
          A completely client-side WebAssembly implementation of the HIV-TRACE pipeline. Uses&nbsp;
          <a href="https://github.com/veg/cawlign" target="_blank" rel="noreferrer">cawlign</a>,&nbsp;
          <a href="https://github.com/veg/tn93" target="_blank" rel="noreferrer">tn93
          </a>, and&nbsp;
          <a href="https://github.com/veg/hivclustering" target="_blank" rel="noreferrer">hivnetworkcsv</a>. Implemented using&nbsp;
          <a href="https://biowasm.com/" target="_blank" rel="noreferrer">Biowasm</a>,&nbsp;
          <a href="https://pyodide.org/" target="_blank" rel="noreferrer">Pyodide</a>, and&nbsp;
          <a href="https://emscripten.org/" target="_blank" rel="noreferrer">Emscripten</a>.
        </p>
        <div id="content" className="mt-3">
          <div id="input-container">
            <h3>Input</h3>
            <div id="input" className="pb-4">
              <div id="input-sequences-container" className="mb-3">
                <label htmlFor="input-sequences" className="form-label">Select Sequence File</label>
                <input className="form-control" type="file" id="input-sequences" onChange={this.setInputFile} />
              </div>
              <p className="mt-4 mb-2">Distance Threshold</p>
              <input type="number" className="form-control" id="distance-threshold" placeholder="Default Distance Threshold: 0.015" min="0" max="1" step="0.01" value={this.state.distanceThreshold} onInput={this.setDistanceThreshold} />
              <p className="mt-4 mb-2">Minimum Overlap (50 to 5000)</p>
              <input type="number" className="form-control" id="min-overlap" placeholder="Default Minimum Overlap: 500" min="50" max="5000" step="50" value={this.state.minOverlap} onInput={this.setMinOverlap} />
              <p className="mt-4 mb-2">Handle Ambiguities</p>
              <select className="form-select" id="ambiguities" value={this.state.ambiguities} onChange={this.setAmbiguities}>
                <option value="resolve">Resolve</option>
                <option value="average">Average</option>
              </select>
              <p className="mt-4 mb-2">Ambiguity Fraction</p>
              <input type="number" className="form-control" id="ambiguity-fraction" placeholder="Default Ambiguity Fraction: 0.015" min="0" max="1" step="0.01" value={this.state.ambiguityFraction} onInput={this.setAmbiguityFraction} />
              <p className="mt-4 mb-2">Remove DRAMS</p>
              <select className="form-select" id="remove-drams" value={this.state.removeDrams} onChange={this.setRemoveDrams}>
                <option value="no">No</option>
                <option value="cdc-surveillance-list">CDC Surveillance List</option>
              </select>
            </div>
            <button className="btn btn-warning mt-4 w-100" id="load-example" onClick={this.loadExample}>Load Example Data</button>
            <button className="btn btn-primary mt-4 w-100" id="run-button" onClick={this.runHivtrace}>Run</button>
          </div>
          <div id="output-console-container">
            <h3>Output</h3>
            <textarea className="form-control" id={OUTPUT_ID} datarows="3" spellCheck="false" disabled></textarea>
          </div>
        </div>
        <small className="text-center mt-5">
          Source code: <a href="https://github.com/veg/hivtrace-wasm">github.com/veg/hivtrace-wasm</a>
        </small>
      </Fragment>
    );
  }
}

export default App;
