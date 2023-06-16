import CRC32 from '../Util/CRC32.js';

export default class DataProcessorChunkReader {
    /** @type {DataReader} */ reader;
    /** @type {boolean} */ eof = false;
    /** @type {boolean} */ closed = false;
    /** @type {boolean} */ reading = false;
    /** @type {Array} */ closePromises = [];
    /** @type {?CRC32} */ crc = null;

    /**
     * @param {DataReader} reader
     * @param {boolean} createCrc
     */
    constructor(reader, createCrc = false) {
        this.reader = reader;
        this.crc = createCrc ? new CRC32() : null;
    }

    /**
     * @param {number} length
     * @return {Promise<Uint8Array>}
     */
    async getChunk(length) {
        if (this.closed) {
            return new Uint8Array(0);
        }
        if (this.reading) {
            throw new Error('Simultaneous read not supported');
        }
        this.reading = true;
        if (this.reader.offset + length > this.reader.byteLength) {
            this.eof = true;
            length = this.reader.byteLength - this.reader.offset;
        }
        let chunk = await this.reader.read(length);

        if(this.crc) {
            this.crc.add(chunk);
        }

        this.reading = false;

        if (this.closePromises.length > 0) {
            this.closePromises.forEach(resolve => resolve());
            this.closePromises = [];
        }

        return chunk;
    }

    /**
     * @return {boolean}
     */
    isEof() {
        return this.eof;
    }

    /**
     * @return {?CRC32}
     */
    getCrc() {
        return this.crc;
    }

    /**
     * @return {Promise<void>}
     */
    close() {
        this.closed = true;
        return new Promise(resolve => {
            if (this.reading) {
                this.closePromises.push(resolve);
            } else {
                resolve();
            }
        });
    }
}
