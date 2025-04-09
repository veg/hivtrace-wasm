export const CAWLIGN_VERSION = "0.1.0";
export const TN93_VERSION = "1.0.11";
export const HIVCLUSTER_RS_VERSION = "0.1.0";
export const OUTPUT_ID = "output-console";

export const DEFAULT_INPUT_STATE = {
};

export const ERROR_MSG = (tool) => {
    return `Error running ${tool} as part of ViralWasm-Epi pipeline. Please check your input and try again.`;
}

export const CLEAR_LOG = () => {
    const textArea = document.getElementById(OUTPUT_ID);
    textArea.value = "";
}

export const GET_TIME_WITH_MILLISECONDS = (date) => {
    const t = date.toLocaleTimeString([], { hour12: false });
    return `${t.substring(0, 8)}.${("00" + date.getMilliseconds()).slice(-3)}`;
}

export const CAWLIGN_TEST_DATA_PATH = 'data/HIV1-pol-326-modified.fa';
export const SEATTLE_FASTA_PATH = 'data/seattle.fasta';