import SignatureStructure from "./SignatureStructure.js";
import Constants from "../../Constants.js";
import {BigInt} from 'armarius-io';

export default class DataDescriptor extends SignatureStructure {
    /**
     * Data descriptor signature
     * @type {number}
     */
    signature = Constants.SIGNATURE_DATA_DESCRIPTOR;

    /**
     * CRC-32
     * @type {number}
     */
    crc32;

    /**
     * Compressed size
     * @type {BigInt}
     */
    compressedSize;

    /**
     * Uncompressed size
     * @type {BigInt}
     */
    uncompressedSize;

    /**
     * @inheritDoc
     */
    async read(reader) {
        this.setSignature(await reader.getUint32());
        this.crc32 = await reader.getUint32();
        this.compressedSize = BigInt(await reader.getUint32());
        this.uncompressedSize = BigInt(await reader.getUint32());
    }

    /**
     * @inheritDoc
     */
    async serialize() {
        let data = new Uint8Array(Constants.LENGTH_DATA_DESCRIPTOR);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        view.setUint32(0, this.signature, true);
        view.setUint32(4, this.crc32, true);
        view.setUint32(8, Number(this.compressedSize), true);
        view.setUint32(12, Number(this.uncompressedSize), true);

        return data;
    }

    /**
     * @inheritDoc
     */
    static getSignature() {
        return Constants.SIGNATURE_DATA_DESCRIPTOR;
    }
}

