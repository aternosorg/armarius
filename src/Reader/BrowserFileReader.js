import DataReader from "./DataReader.js";
import BigIntUtils from "../Util/BigIntUtils.js";


export default class BrowserFileReader extends DataReader {
    /**  @type {File} */ file;
    /** @type {?Uint8Array} */ buffer;
    /** @type {DataView} */ bufferView;
    /** @type {Number} */ bufferStartOffset;
    /** @type {FileReader} */ reader = new FileReader();
    /** @type {boolean} */ blocked = false;

    /**
     * @param {File} file
     * @param {number} byteOffset
     * @param {?number} byteLength
     */
    constructor(file, byteOffset = 0, byteLength = null) {
        super();
        this.file = file;
        this.byteLength = byteLength !== null ? byteLength : file.size - byteOffset;
        this.byteOffset = byteOffset;
        if (this.byteLength < 0 || this.file.size < this.byteOffset + this.byteLength) {
            throw new Error('Invalid file range');
        }
    }

    /**
     * @inheritDoc
     */
    async readAt(offset, length, longLived = true) {
        if (this.buffer && offset >= this.bufferStartOffset && length <= this.buffer.byteLength - (offset - this.bufferStartOffset)) {
            return this.readFromBuffer(offset, length, longLived);
        }

        if (length < this.bufferSize) {
            this.setBuffer(offset, await this.readRaw(offset, Math.max(length, Math.min(this.bufferSize, this.byteLength - offset))));
            return this.readFromBuffer(offset, length, longLived);
        }

        return await this.readRaw(offset, length);
    }

    /**
     * @param {number} offset
     * @param {number} length
     * @protected
     * @returns {Promise<Uint8Array>}
     */
    readRaw(offset, length) {
        return new Promise((resolve, reject) => {
            if (this.blocked) {
                return reject(Error('Multiple simultaneous reads are not supported'));
            }
            if (offset < 0) {
                return reject(new Error(`Cannot read at negative offsets (got ${offset})`));
            }
            if (offset + length > this.byteLength) {
                return reject(new Error(`Cannot read beyond end of data (trying to read ${length} bytes at ${offset}, data length is ${this.byteLength})`));
            }
            this.blocked = true;
            this.reader.onload = () => {
                this.blocked = false;
                /** @type {ArrayBuffer} */
                let res = this.reader.result;
                resolve(new Uint8Array(res));
            };
            this.reader.onerror = reject;
            this.reader.readAsArrayBuffer(this.file.slice(this.byteOffset + offset, this.byteOffset + offset + length));
        });
    }

    /**
     * @param {number} offset
     * @param {number} length
     * @param {boolean} longLived
     * @protected
     * @returns {Uint8Array}
     */
    readFromBuffer(offset, length, longLived = false) {
        let bufferOffset = offset - this.bufferStartOffset;
        if (bufferOffset < 0 || bufferOffset + length > this.buffer.byteLength) {
            throw new Error(`Cannot read ${length} bytes of buffer at ${bufferOffset}`);
        }

        if (longLived && this.buffer.byteLength - length > 512) {
            return this.buffer.slice(bufferOffset, bufferOffset + length);
        }

        return new Uint8Array(this.buffer.buffer, this.buffer.byteOffset + bufferOffset, length);
    }

    /**
     * @param {number} bufferOffset
     * @param {Uint8Array} data
     * @protected
     */
    setBuffer(bufferOffset, data) {
        this.buffer = data;
        this.bufferView = new DataView(data.buffer, data.byteOffset, data.byteLength);
        this.bufferStartOffset = bufferOffset;
    }

    /**
     * @inheritDoc
     */
    async getUint8At(offset) {
        if (this.buffer && offset > this.bufferStartOffset && offset - this.bufferStartOffset + 1 < this.buffer.byteLength) {
            return this.bufferView.getUint8(offset - this.bufferStartOffset);
        }
        return super.getUint8At(offset);
    }

    /**
     * @inheritDoc
     */
    async getUint16At(offset, littleEndian = true) {
        if (this.buffer && offset > this.bufferStartOffset && offset - this.bufferStartOffset + 2 < this.buffer.byteLength) {
            return this.bufferView.getUint16(offset - this.bufferStartOffset, littleEndian);
        }
        return super.getUint16At(offset, littleEndian);
    }

    /**
     * @inheritDoc
     */
    async getUint32At(offset, littleEndian = true) {
        if (this.buffer && offset > this.bufferStartOffset && offset - this.bufferStartOffset + 4 < this.buffer.byteLength) {
            return this.bufferView.getUint32(offset - this.bufferStartOffset, littleEndian);
        }
        return super.getUint32At(offset, littleEndian);
    }

    /**
     * @inheritDoc
     */
    async getBigUint64At(offset, littleEndian = true) {
        if (this.buffer && offset > this.bufferStartOffset && offset - this.bufferStartOffset + 8 < this.buffer.byteLength) {
            return BigIntUtils.getBigUint64FromView(this.bufferView, offset - this.bufferStartOffset, littleEndian);
        }
        return super.getBigUint64At(offset, littleEndian);
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
}

