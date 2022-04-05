import FileHeader from "./FileHeader.js";
import Constants from "../../Constants.js";

export default class CentralDirectoryFileHeader extends FileHeader {
    /**
     * Central file header signature
     * @type {number}
     */
    signature = Constants.SIGNATURE_CENTRAL_DIR_FILE_HEADER;

    /**
     * Version made by
     * @type {number}
     */
    madeByVersion;

    /**
     * File comment length
     *
     * This value is ignored in serialization.
     * Instead, the correct value is calculated.
     * @type {number}
     */
    fileCommentLength;

    /**
     * Disk number start
     * @type {number}
     */
    diskNumberStart;

    /**
     * Internal file attributes
     * @type {number}
     */
    internalFileAttributes;

    /**
     * External file attributes
     * @type {number}
     */
    externalFileAttributes;

    /**
     * Relative offset of local header
     * @type {number}
     */
    localHeaderOffset;

    /**
     * File comment
     * @type {Uint8Array}
     */
    fileComment;

    /**
     * @inheritDoc
     */
    async read(reader) {
        this.setSignature(await reader.getUint32());
        this.madeByVersion = await reader.getUint16();
        this.extractionVersion = await reader.getUint16();
        this.bitFlag = await reader.getUint16();
        this.compressionMethod = await reader.getUint16();
        this.fileModTime = await reader.getUint16();
        this.fileModDate = await reader.getUint16();
        this.crc32 = await reader.getUint32();
        this.compressedSize = await reader.getUint32();
        this.uncompressedSize = await reader.getUint32();
        this.fileNameLength = await reader.getUint16();
        this.extraFieldLength = await reader.getUint16();
        this.fileCommentLength = await reader.getUint16();
        this.diskNumberStart = await reader.getUint16();
        this.internalFileAttributes = await reader.getUint16();
        this.externalFileAttributes = await reader.getUint32();
        this.localHeaderOffset = await reader.getUint32();

        this.fileName = await reader.read(this.fileNameLength);
        this.extraField = await reader.read(this.extraFieldLength);
        this.fileComment = await reader.read(this.fileCommentLength);

        await this.loadExtraFields();
    }

    /**
     * @inheritDoc
     */
    async serialize() {
        await this.serializeExtraFields();
        let data = new Uint8Array(Constants.LENGTH_CENTRAL_DIR_FILE_HEADER +
            this.fileName.byteLength + this.extraField.byteLength + this.fileComment.byteLength);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        view.setUint32(0, this.signature, true);
        view.setUint16(4, this.madeByVersion, true);
        view.setUint16(6, this.extractionVersion, true);
        view.setUint16(8, this.bitFlag, true);
        view.setUint16(10, this.compressionMethod, true);
        view.setUint16(12, this.fileModTime, true);
        view.setUint16(14, this.fileModDate, true);
        view.setUint32(16, this.crc32, true);
        view.setUint32(20, this.compressedSize, true);
        view.setUint32(24, this.uncompressedSize, true);
        view.setUint16(28, this.fileName.byteLength, true);
        view.setUint16(30, this.extraField.byteLength, true);
        view.setUint16(32, this.fileComment.byteLength, true);
        view.setUint16(34, this.diskNumberStart, true);
        view.setUint16(36, this.internalFileAttributes, true);
        view.setUint32(38, this.externalFileAttributes, true);
        view.setUint32(42, this.localHeaderOffset, true);

        let offset = Constants.LENGTH_CENTRAL_DIR_FILE_HEADER;
        data.set(this.fileName, offset);
        offset += this.fileName.byteLength;
        data.set(this.extraField, offset);
        offset += this.extraField.byteLength;
        data.set(this.fileComment, offset);

        return data;
    }

    /**
     * @inheritDoc
     */
    static getSignature() {
        return Constants.SIGNATURE_CENTRAL_DIR_FILE_HEADER;
    }
}

