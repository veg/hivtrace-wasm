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
    };
  }

  componentDidMount() {
    this.initPyodide();
    this.initBiowasm();
  }

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
        const data = await (await fetch(`${import.meta.env.BASE_URL || ""}data/HIV1-pol-326-modified.fa`)).text();
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
        <h1 className="mt-5 text-center">HIV-TRACE WASM</h1>
        <p className="text-center">
          A WebAssembly implementation of the HIV-TRACE pipeline. Uses&nbsp;
          <a href="https://github.com/veg/cawlign" target="_blank" rel="noreferrer">
            cawlign
          </a>
          ,&nbsp;
          <a href="https://github.com/veg/tn93" target="_blank" rel="noreferrer">
            tn93
          </a>
          , and&nbsp;
          <a href="https://github.com/veg/hivclustering" target="_blank" rel="noreferrer">
            hivnetworkcsv
          </a>
          . Implemented using&nbsp;
          <a href="https://biowasm.com/" target="_blank" rel="noreferrer">
            Biowasm
          </a>
          ,&nbsp;
          <a href="https://pyodide.org/" target="_blank" rel="noreferrer">
            Pyodide
          </a>
          , and&nbsp;
          <a href="https://emscripten.org/" target="_blank" rel="noreferrer">
            Emscripten
          </a>
          .
        </p>
        <textarea
          className="form-control mt-5"
          id={OUTPUT_ID}
          data-testid="output-text"
          datarows="3"
          spellCheck="false"
          disabled
        ></textarea>
      </Fragment>
    );
  }
}

export default App;
