import CRC32 from '../Util/CRC32.js';
import DataProcessor from './DataProcessor.js';
import DataProcessorChunkReader from './DataProcessorChunkReader.js';

/**
 * @implements DataProcessor
 */
export default class AbstractDataProcessor extends DataProcessor {
    /** @type {DataReader} */ reader;
    /** @type {DataProcessorChunkReader} */ chunkReader;
    /** @type {?CRC32} */ postCrc = null;
    /** @type {boolean} */ createPreCrc = false;

    /**
     * @inheritDoc
     */
    static isSupported() {
        return true;
    }

    /**
     * @param {DataReader} reader
     * @param {boolean} createPreCrc
     * @param {boolean} createPostCrc
     */
    constructor(reader, createPreCrc = false, createPostCrc = false) {
        super();
        this.reader = reader;
        this.createPreCrc = createPreCrc;
        this.chunkReader = new DataProcessorChunkReader(this.reader, this.createPreCrc);
        this.postCrc = createPostCrc ? new CRC32() : null;
    }

    /**
     * @inheritDoc
     */
    getPreCrc() {
        return this.chunkReader.getCrc();
    }

    /**
     * @inheritDoc
     */
    getPostCrc() {
        return this.postCrc;
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

    /**
     * @inheritDoc
     */
    async reset() {
        await this.chunkReader.close();
        this.chunkReader = new DataProcessorChunkReader(this.reader, this.createPreCrc);
        this.postCrc?.reset();
        this.reader.seek(0);
    }
}

