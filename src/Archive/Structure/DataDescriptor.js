import SignatureStructure from "./SignatureStructure.js";
import constants from "../../constants.js";
import BigInt from "../../Util/BigInt.js";

export default class DataDescriptor extends SignatureStructure {
    /**
     * Data descriptor signature
     * @type {number}
     */
    signature = constants.SIGNATURE_DATA_DESCRIPTOR;

    /**
     * CRC-32
     * @type {number}
     */
    crc32;

    /**
     * Compressed size
     * @type {bigint}
     */
    compressedSize;

    /**
     * Uncompressed size
     * @type {bigint}
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
        let data = new Uint8Array(constants.LENGTH_DATA_DESCRIPTOR);
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
        return constants.SIGNATURE_DATA_DESCRIPTOR;
    }
}

