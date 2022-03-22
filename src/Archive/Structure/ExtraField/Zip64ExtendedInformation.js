import ExtraField from "./ExtraField.js";

export default class Zip64ExtendedInformation extends ExtraField {
    /**
     * Original uncompressed file size
     * @type {bigint}
     */
    uncompressedSize;

    /**
     * Size of compressed data
     * @type {bigint}
     */
    compressedSize;

    /**
     * Offset of local header record
     * @type {bigint}
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

        view.setBigUint64(2, this.uncompressedSize, true);
        view.setBigUint64(10, this.compressedSize, true);
        view.setBigUint64(18, this.localHeaderOffset, true);
        view.setUint32(26, this.diskNumberStart, true);

        return data;
    }
}

