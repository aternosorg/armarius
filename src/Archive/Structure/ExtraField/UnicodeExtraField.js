import ExtraField from "./ExtraField.js";
import CRC32 from "../../../Util/CRC32.js";

export default class UnicodeExtraField extends ExtraField {
    /**
     * Version of this extra field, currently 1
     * @type {number}
     */
    version = 1;

    /**
     * Data CRC32 Checksum
     *
     * This value is ignored in serialization.
     * Instead, the correct value is calculated.
     * @type {number}
     */
    crc32;

    /**
     * UTF-8 version of the entry File Name/Comment
     * @type {Uint8Array}
     */
    data;

    /**
     * @type {boolean}
     * @protected
     */
    valid;

    /**
     * @param {DataReader} reader
     * @returns {Promise<void>}
     */
    async read(reader) {
        await super.read(reader);
        this.version = await reader.getUint8();
        if (this.version !== 1) {
            throw new Error(`Unknown unicode extra field version ${this.version}`);
        }
        this.crc32 = await reader.getUint32();
        this.data = await reader.read(this.size - 5);
    }

    /**
     * @returns {Promise<Uint8Array>}
     */
    async serialize() {
        let data = new Uint8Array(7 + this.data.byteLength);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        view.setUint16(0, 5 + this.data.byteLength, true);

        view.setUint8(2, this.version);
        view.setUint32(3, CRC32.hash(this.data), true);
        data.set(this.data, 7);

        return data;
    }

    /**
     * @returns {boolean}
     */
    isValid() {
        return this.valid;
    }
}

