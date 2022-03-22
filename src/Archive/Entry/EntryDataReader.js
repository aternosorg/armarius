import CRC32 from "../../Util/CRC32.js";

export default class EntryDataReader {
    /** @type {DataReader} */ reader;
    /** @type {DataProcessor} */ dataProcessor;
    /** @type {CRC32} */ crc32;
    /** @type {number} */ expectedCrc32;
    /** @type {boolean} */ createChecksum = true;
    /** @type {boolean} */ eof = false;

    /**
     * @param {DataReader} reader
     * @param {DataProcessor} dataProcessor
     * @param {number} expectedCrc32
     */
    constructor(reader, dataProcessor, expectedCrc32) {
        this.reader = reader;
        this.dataProcessor = dataProcessor;
        this.expectedCrc32 = expectedCrc32;
        this.crc32 = new CRC32();
    }

    reset() {
        this.dataProcessor.reset();
        this.reader.seek(0);
        this.crc32.reset();
        this.eof = false;
    }

    /**
     * @param {number} length
     * @returns {Promise<?Uint8Array>}
     */
    async read(length) {
        if (this.eof) {
            return null;
        }
        if (this.reader.offset + length > this.reader.byteLength) {
            this.eof = true;
            length = this.reader.byteLength - this.reader.offset;
        }

        let chunk = await this.reader.read(length);
        let uncompressed = await this.dataProcessor.process(chunk, this.eof);

        if (this.createChecksum) {
            this.crc32.add(uncompressed);
            if (this.eof && this.crc32.finish() !== this.expectedCrc32) {
                throw new Error('CRC32 checksum does not match expected value');
            }
        }

        return uncompressed;
    }
}

