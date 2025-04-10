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

// List of available references from data/references/ directory
export const AVAILABLE_REFERENCES = [
  // HIV references
  "HXB2_gag",
  "HXB2_int",
  "HXB2_nef",
  "HXB2_pol",
  "HXB2_pr",
  "HXB2_prrt",
  "HXB2_rev",
  "HXB2_rt",
  "HXB2_tat",
  "HXB2_vif",
  // COVID references
  "CoV2-E",
  "CoV2-M",
  "CoV2-N",
  "CoV2-ORF10",
  "CoV2-ORF1a",
  "CoV2-ORF1b",
  "CoV2-ORF3a",
  "CoV2-ORF5",
  "CoV2-ORF6",
  "CoV2-ORF7a",
  "CoV2-ORF7b",
  "CoV2-ORF8",
  "CoV2-RdRp",
  "CoV2-S",
  "CoV2-endornase",
  "CoV2-exonuclease",
  "CoV2-helicase",
  "CoV2-leader",
  "CoV2-methyltransferase",
  "CoV2-nsp10",
  "CoV2-nsp2",
  "CoV2-nsp3",
  "CoV2-nsp4",
  "CoV2-nsp6",
  "CoV2-nsp7",
  "CoV2-nsp8",
  "CoV2-nsp9",
  "CoV2-threeC"
];