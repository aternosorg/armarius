import SignatureStructure from "./SignatureStructure.js";
import constants from "../../constants.js";

/**
 * End of central directory record
 */
export default class EndOfCentralDirectoryRecord extends SignatureStructure {
    /**
     * End of central dir signature
     * @type {number}
     */
    signature = constants.SIGNATURE_END_OF_CENTRAL_DIR;

    /**
     * Number of this disk
     * @type {number}
     */
    diskNumber;

    /**
     * Number of the disk with the start of the central directory
     * @type {number}
     */
    centralDirectoryDiskNumber;

    /**
     * Total number of entries in the central directory on this disk
     * @type {number}
     */
    diskCentralDirectoryEntries;

    /**
     * Total number of entries in the central directory
     * @type {number}
     */
    centralDirectoryEntries;

    /**
     * Size of the central directory
     * @type {number}
     */
    centralDirectorySize;

    /**
     * Offset of start of central directory with respect to the starting disk number
     * @type {number}
     */
    centralDirectoryOffset;

    /**
     * ZIP file comment length
     *
     * This value is ignored in serialization.
     * Instead, the correct value is calculated.
     * @type {number}
     */
    fileCommentLength;

    /**
     * ZIP file comment
     * @type {Uint8Array}
     */
    fileComment;

    /**
     * @inheritDoc
     */
    async read(reader) {
        this.setSignature(await reader.getUint32());
        this.diskNumber = await reader.getUint16();
        this.centralDirectoryDiskNumber = await reader.getUint16();
        this.diskCentralDirectoryEntries = await reader.getUint16();
        this.centralDirectoryEntries = await reader.getUint16();
        this.centralDirectorySize = await reader.getUint32();
        this.centralDirectoryOffset = await reader.getUint32();
        this.fileCommentLength = await reader.getUint16();
        this.fileComment = await reader.read(this.fileCommentLength);
    }

    /**
     * @inheritDoc
     */
    async serialize() {
        let data = new Uint8Array(constants.LENGTH_END_OF_CENTRAL_DIR + this.fileComment.byteLength);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        view.setUint32(0, this.signature, true);
        view.setUint16(4, this.diskNumber, true);
        view.setUint16(6, this.centralDirectoryDiskNumber, true);
        view.setUint16(8, this.diskCentralDirectoryEntries, true);
        view.setUint16(10, this.centralDirectoryEntries, true);
        view.setUint32(12, this.centralDirectorySize, true);
        view.setUint32(16, this.centralDirectoryOffset, true);
        view.setUint16(20, this.fileComment.byteLength, true);
        data.set(this.fileComment, 22);
        return data;
    }

    /**
     * @inheritDoc
     */
    static getSignature() {
        return constants.SIGNATURE_END_OF_CENTRAL_DIR;
    }
}

