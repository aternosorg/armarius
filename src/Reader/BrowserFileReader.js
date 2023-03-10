import ArmariusError from '../Error/ArmariusError.js';
import BufferedDataReader from './BufferedDataReader.js';


export default class BrowserFileReader extends BufferedDataReader {
    /**  @type {File} */ file;
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
            throw new ArmariusError('Invalid file range');
        }
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
                return reject(new ArmariusError(`Cannot read at negative offsets (got ${offset})`));
            }
            if (offset + length > this.byteLength) {
                return reject(new ArmariusError(`Cannot read beyond end of data (trying to read ${length} bytes at ${offset}, data length is ${this.byteLength})`));
            }
            this.blocked = true;
            this.reader.onload = () => {
                this.blocked = false;
                /** @type {ArrayBuffer} */
                let res = this.reader.result;
                resolve(new Uint8Array(res));
            };
            this.reader.onerror = () => {
                reject(this.reader.error || new ArmariusError('An unknown error occurred while reading from Blob'));
            };
            this.reader.readAsArrayBuffer(this.file.slice(this.byteOffset + offset, this.byteOffset + offset + length));
        });
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

