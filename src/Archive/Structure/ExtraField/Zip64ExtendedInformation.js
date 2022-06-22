import ExtraField from "./ExtraField.js";
import BigIntUtils from "../../../Util/BigIntUtils.js";

export default class Zip64ExtendedInformation extends ExtraField {
    /**
     * Original uncompressed file size
     * @type {BigInt}
     */
    uncompressedSize;

    /**
     * Size of compressed data
     * @type {BigInt}
     */
    compressedSize;

    /**
     * Offset of local header record
     * @type {BigInt}
     */
    localHeaderOffset;

    /**
     * Number of the disk on which this file starts
     * Disk number start
     * @type {number}
     */
    diskNumberStart;

    /**
     * @inheritDoc
     */
    async read(reader) {
        await super.read(reader);
        this.uncompressedSize = await reader.getBigUint64();
        this.compressedSize = await reader.getBigUint64();
        this.localHeaderOffset = await reader.getBigUint64();
        this.diskNumberStart = await reader.getUint32();
    }

    /**
     * @inheritDoc
     */
    async serialize() {
        let data = new Uint8Array(30);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        view.setUint16(0, 28, true);

        BigIntUtils.setBigUint64InView(view, 2, this.uncompressedSize, true);
        BigIntUtils.setBigUint64InView(view, 10, this.compressedSize, true);
        BigIntUtils.setBigUint64InView(view, 18, this.localHeaderOffset, true);
        view.setUint32(26, this.diskNumberStart, true);

        return data;
    }
}

