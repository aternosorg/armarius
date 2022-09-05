import FflateDataProcessor from "./FflateDataProcessor.js";
import {Inflate} from 'fflate';

export default class FflateInflateDataProcessor extends FflateDataProcessor {
    initFflate() {
        this.flate = new Inflate();
        this.flate.ondata = this.onData.bind(this);
    }
}

