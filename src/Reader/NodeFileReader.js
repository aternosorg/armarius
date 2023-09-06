import BufferedDataReader from './BufferedDataReader.js';
import * as fs from 'node:fs';
import ArmariusError from '../Error/ArmariusError.js';

export default class NodeFileReader extends BufferedDataReader {
    /**  @type {FileHandle} */ file;
    /** @type {boolean} */ blocked = false;

    /**
     * @param {string} path
     * @return {Promise<NodeFileReader>}
     */
    static async open(path) {
        let file = await fs.promises.open(path, 'r');
        let stat = await file.stat();
        return new this(file, 0, stat.size);
    }

    /**
     * @param {FileHandle} file
     * @param {number} byteOffset
     * @param {number} byteLength
     */
    constructor(file, byteOffset, byteLength) {
        super();
        this.file = file;
        this.byteLength = byteLength;
        this.byteOffset = byteOffset;
        if (this.byteLength < 0) {
            throw new ArmariusError('Invalid file range');
        }
    }

    /**
     * @param {number} offset
     * @param {number} length
     * @protected
     * @returns {Promise<Uint8Array>}
     */
    async readRaw(offset, length) {
        if (offset < 0) {
            throw new ArmariusError(`Cannot read at negative offsets (got ${offset})`);
        }
        if (offset + length > this.byteLength) {
            throw new ArmariusError(`Cannot read beyond end of data (trying to read ${length} bytes at ${offset}, data length is ${this.byteLength})`);
        }
        if(this.blocked) {
            throw new Error('Multiple simultaneous reads are not supported');
        }
        this.blocked = true;

        const data = Buffer.alloc(length);
        try {
            await this.file.read({position: this.byteOffset + offset, length, buffer: data});
        } catch (e) {
            this.blocked = false;
            throw e;
        }
        this.blocked = false;
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }

    /**
     * @inheritDoc
     */
    async clone(cloneOffset = 0, cloneLength = null) {
        if (cloneLength === null) {
            cloneLength = this.byteLength - cloneOffset;
        }
        return new this.constructor(this.file, this.byteOffset + cloneOffset, cloneLength)
            .setMaxBufferSize(this.bufferSize);
    }

    /**
     * @return {Promise<this>}
     */
    async close() {
        await this.file.close();
        return this;
    }
}
