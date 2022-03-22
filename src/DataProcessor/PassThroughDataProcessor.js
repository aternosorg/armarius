import DataProcessor from "./DataProcessor.js";

export default class PassThroughDataProcessor extends DataProcessor {
    /**
     * @inheritDoc
     */
    async process(data, lastChunk = false) {
        return data;
    }

    /**
     * @inheritDoc
     */
    async reset() {

    }
}

