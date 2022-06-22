import DataProcessor from "./DataProcessor.js";

/**
 * @abstract
 */
export default class PakoDataProcessor extends DataProcessor {
    /** @type {Uint8Array[]} */ chunks = [];
    /** @type {Deflate|Inflate} */ pako;

    constructor() {
        super();
        this.reset();
    }

    /**
     * @inheritDoc
     */
    async process(data, lastChunk = false) {
        this.pako.push(data, lastChunk);
        return this.concatChunks();
    }

    /**
     * @protected
     * @returns {Uint8Array}
     */
    concatChunks() {
        let chunks = this.chunks;
        this.chunks = [];

        if (!chunks.length) {
            return new Uint8Array(0);
        }
        if (chunks.length === 1) {
            return chunks[0];
        }

        let length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
        let res = new Uint8Array(length);
        let offset = 0;
        for (let chunk of chunks) {
            res.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return res;
    }

    /**
     * @protected
     * @abstract
     */
    initPako() {

    }

    /**
     * @protected
     * @param {Uint8Array} chunk
     */
    onData(chunk) {
        this.chunks.push(chunk);
    }

    /**
     * @inheritDoc
     */
    reset() {
        this.chunks = [];
        this.initPako();
    }
}

