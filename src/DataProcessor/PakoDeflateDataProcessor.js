import PakoDataProcessor from "./PakoDataProcessor.js";
import pako from "pako";

export default class PakoDeflateDataProcessor extends PakoDataProcessor {
    /**
     * @inheritDoc
     */
    initPako() {
        this.pako = new pako.Deflate({raw: true});
        this.pako.onData = this.onData.bind(this);
    }
}

