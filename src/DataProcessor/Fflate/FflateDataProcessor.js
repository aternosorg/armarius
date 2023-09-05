import AbstractDataProcessor from '../AbstractDataProcessor.js';
import BufferUtils from '../../Util/BufferUtils.js';

/**
 * @abstract
 */
export default class FflateDataProcessor extends AbstractDataProcessor {
    /** @type {Uint8Array[]} */ chunks = [];
    /** @type {import("fflate").Deflate|import("fflate").Inflate} */ flate;

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
        if(this.chunkReader.isEof()) {
            return null;
        }

        this.flate.push(await this.chunkReader.getChunk(length), this.chunkReader.isEof());
        return this.concatChunks();
    }

    /**
     * @protected
     * @returns {Uint8Array}
     */
    concatChunks() {
        let chunks = this.chunks;
        this.chunks = [];

        return BufferUtils.concatBuffers(chunks);
    }

    /**
     * @protected
     * @abstract
     */
    initFflate() {

    }

    /**
     * @protected
     * @param {Uint8Array} chunk
     * @param {boolean} final
     */
    onData(chunk, final) {
        this.chunks.push(chunk);
    }

    /**
     * @inheritDoc
     */
    async reset() {
        await super.reset();
        this.chunks = [];
        this.initFflate();
    }
}
