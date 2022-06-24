import DataReader from "./DataReader.js";
import BigIntUtils from "../Util/BigIntUtils.js";


export default class ArrayBufferReader extends DataReader {
    /** @type {Uint8Array} */ data;
    /** @type {DataView} */ view;

    /**
     * @param {ArrayBuffer} buffer
     * @param {number} offset
     * @param {?number} length
     */
    constructor(buffer, offset = 0, length = null) {
        super();
        this.data = new Uint8Array(buffer);
        this.view = new DataView(buffer, offset, length);
        this.byteOffset = offset;
        this.byteLength = length ?? buffer.byteLength;
    }

    /**
     * @inheritDoc
     */
    async clone(cloneOffset = 0, cloneLength = null) {
        if (cloneLength === null) {
            cloneLength = this.byteLength - cloneOffset;
        }
        return new this.constructor(this.data.buffer, this.byteOffset + cloneOffset, cloneLength);
    }

    /**
     * @inheritDoc
     */
    async readAt(offset, length, longLived) {
        if (offset < 0) {
            throw new Error(`Cannot read at negative offsets (got ${offset})`);
        }
        if (offset + length > this.byteLength) {
            throw new Error(`Cannot read beyond end of data (trying to read ${length} bytes at ${offset}, data length is ${this.byteLength})`);
        }
        if (longLived && this.byteLength - length > 64) {
            return this.data.slice(this.byteOffset + offset, this.byteOffset + offset + length);
        }
        return new Uint8Array(this.data.buffer, this.byteOffset + offset, length);
    }

    /**
     * @inheritDoc
     */
    async getUint8At(offset) {
        return this.view.getUint8(offset);
    }

    /**
     * @inheritDoc
     */
    async getUint16At(offset, littleEndian = true) {
        return this.view.getUint16(offset, littleEndian);
    }

    /**
     * @inheritDoc
     */
    async getUint32At(offset, littleEndian = true) {
        return this.view.getUint32(offset, littleEndian);
    }

    /**
     * @inheritDoc
     */
    async getBigUint64At(offset, littleEndian = true) {
        return BigIntUtils.getBigUint64FromView(this.view, offset, littleEndian);
    }
}

