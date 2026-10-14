import ExtraField from "./ExtraField.js";
import Constants from "../../../Constants.js";
import {BigIntUtils} from "armarius-io";

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
     * A value is only present in the Zip64 extended information field if the
     * corresponding base field in the file header is set to its maximum value
     * (all bits set). The fields keep their fixed order, but any of them may be
     * absent, so we only read a value when its base field signals that it was
     * moved into this field. The declared size is used as an additional bound in
     * case the field is truncated or no header context is available.
     *
     * @param {import("armarius-io").IO} reader
     * @param {?import("../FileHeader.js").default} header
     */
    async read(reader, header = null) {
        await super.read(reader);

        let remaining = this.size;

        // Without a header to compare against, fall back to reading every field
        // that still fits in the declared size.
        let hasUncompressedSize = !header || header.uncompressedSize === Constants.MAX_UINT32;
        let hasCompressedSize = !header || header.compressedSize === Constants.MAX_UINT32;
        let hasLocalHeaderOffset = !header || header.localHeaderOffset === Constants.MAX_UINT32;
        let hasDiskNumberStart = !header || header.diskNumberStart === Constants.MAX_UINT16;

        if (hasUncompressedSize && remaining >= 8) {
            this.uncompressedSize = await reader.getBigUint64();
            remaining -= 8;
        }
        if (hasCompressedSize && remaining >= 8) {
            this.compressedSize = await reader.getBigUint64();
            remaining -= 8;
        }
        if (hasLocalHeaderOffset && remaining >= 8) {
            this.localHeaderOffset = await reader.getBigUint64();
            remaining -= 8;
        }
        if (hasDiskNumberStart && remaining >= 4) {
            this.diskNumberStart = await reader.getUint32();
            remaining -= 4;
        }
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

