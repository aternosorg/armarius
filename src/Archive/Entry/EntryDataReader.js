import CRC32 from "../../Util/CRC32.js";

export default class EntryDataReader {
    /** @type {DataProcessor} */ dataProcessor;
    /** @type {CRC32} */ crc32;
    /** @type {number} */ expectedCrc32;
    /** @type {boolean} */ createChecksum = true;

    /**
     * @param {DataProcessor} dataProcessor
     * @param {number} expectedCrc32
     */
    constructor(dataProcessor, expectedCrc32) {
        this.dataProcessor = dataProcessor;
        this.expectedCrc32 = expectedCrc32;
    }

    reset() {
        this.dataProcessor.reset();
        this.eof = false;
    }

    /**
     * @param {number} length
     * @returns {Promise<?Uint8Array>}
     */
    async read(length) {
        let uncompressed = await this.dataProcessor.read(length);
        let eof = uncompressed === null;

        if (this.dataProcessor.getPostCrc()) {
            if (eof && this.dataProcessor.getPostCrc().finish() !== this.expectedCrc32) {
                throw new Error('CRC32 checksum does not match expected value');
            }
        }

        return uncompressed;
    }
}

