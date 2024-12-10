import ChecksumError from '../../Error/ChecksumError.js';
import {DataStream} from 'armarius-io';
import EntryDataReaderOptions from '../../Options/EntryDataReaderOptions.js';

export default class EntryDataReader extends DataStream {
    /** @type {import("armarius-io").DataProcessor} */ dataProcessor;
    /** @type {import("armarius-io").CRC32} */ crc32;
    /** @type {number} */ expectedCrc32;
    /** @type {number} */ expectedSize;
    /** @type {number} */ offset = 0;
    /** @type {EntryDataReaderOptions} */ options;

    /**
     * @param {import("armarius-io").DataProcessor} dataProcessor
     * @param {number} expectedCrc32
     * @param {number} expectedSize
     * @param {EntryDataReaderOptions|EntryDataReaderOptionsObject} options
     */
    constructor(dataProcessor, expectedCrc32, expectedSize, options) {
        super();
        this.dataProcessor = dataProcessor;
        this.expectedCrc32 = expectedCrc32;
        this.expectedSize = expectedSize;
        this.options = EntryDataReaderOptions.from(options);
    }

    /**
     * @inheritDoc
     */
    async reset() {
        await this.dataProcessor.reset();
        this.offset = 0;
        this.eof = false;
        return this;
    }

    /**
     * @param {number} length
     * @returns {Promise<?Uint8Array>}
     */
    async read(length) {
        let uncompressed = await this.dataProcessor.read(length);
        let eof = uncompressed === null;

        if (!eof) {
            this.offset += uncompressed.byteLength;
        }

        if (this.dataProcessor.getPostCrc()) {
            if (eof && this.dataProcessor.getPostCrc().finish() !== this.expectedCrc32) {
                if (!this.options.ignoreInvalidChecksums) {
                    throw new ChecksumError(`CRC32 checksum does not match expected value. Expected ${this.expectedCrc32}, got ${this.dataProcessor.getPostCrc().finish()}`);
                }
            }
        }

        return uncompressed;
    }

    /**
     * @returns {number}
     */
    getFinalLength() {
        return this.expectedSize;
    }

    /**
     * @inheritDoc
     */
    async pull(length) {
        return await this.read(length);
    }

    /**
     * @inheritDoc
     */
    getOffset() {
        return this.offset;
    }
}

