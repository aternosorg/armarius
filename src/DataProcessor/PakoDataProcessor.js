import AbstractDataProcessor from './AbstractDataProcessor.js';

/**
 * @abstract
 */
export default class PakoDataProcessor extends AbstractDataProcessor {
    /** @type {Uint8Array[]} */ chunks = [];
    /** @type {Deflate|Inflate} */ pako;

    /**
     * @inheritDoc
     */
    constructor(reader, createPreCrc = false, createPostCrc = false) {
        super(reader, createPreCrc, createPostCrc);
        this.reset();
    }

    /**
     * @inheritDoc
     */
    async generate(length) {
        if(this.eof) {
            return null;
        }

        this.pako.push(await this.getChunkFromReader(length), this.eof);
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
        super.reset();
        this.chunks = [];
        this.initPako();
    }
}
