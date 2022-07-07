import CRC32 from '../Util/CRC32.js';
import DataProcessor from './DataProcessor.js';

/**
 * @implements DataProcessor
 */
export default class AbstractDataProcessor extends DataProcessor {
    /** @type {DataReader} */ reader;
    /** @type {boolean} */ eof = false;
    /** @type {?CRC32} */ preCrc = null;
    /** @type {?CRC32} */ postCrc = null;

    /**
     * @param {DataReader} reader
     * @param {boolean} createPreCrc
     * @param {boolean} createPostCrc
     */
    constructor(reader, createPreCrc = false, createPostCrc = false) {
        super();
        this.reader = reader;
        this.preCrc = createPreCrc ? new CRC32() : null;
        this.postCrc = createPostCrc ? new CRC32() : null;
    }

    /**
     * @inheritDoc
     */
    getPreCrc() {
        return this.preCrc;
    }

    /**
     * @inheritDoc
     */
    getPostCrc() {
        return this.postCrc;
    }

    /**
     * @inheritDoc
     */
    async getChunkFromReader(length) {
        if (this.reader.offset + length > this.reader.byteLength) {
            this.eof = true;
            length = this.reader.byteLength - this.reader.offset;
        }
        let chunk = await this.reader.read(length);
        if(this.preCrc) {
            this.preCrc.add(chunk);
        }

        return chunk;
    }

    async process() {

    }

    /**
     * @inheritDoc
     */
    async generate(length) {

    }

    /**
     * @inheritDoc
     */
    async read(length) {
        let chunk = await this.generate(length);
        if(this.postCrc && chunk !== null) {
            this.postCrc.add(chunk);
        }

        return chunk;
    }

    reset() {
        this.eof = false;
        this.preCrc?.reset();
        this.postCrc?.reset();
        this.reader.seek(0);
    }
}

