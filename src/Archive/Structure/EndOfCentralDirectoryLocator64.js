import SignatureStructure from "./SignatureStructure.js";
import constants from "../../constants.js";

/**
 * Zip64 end of central directory locator
 */
export default class EndOfCentralDirectoryLocator64 extends SignatureStructure {
    /**
     * Zip64 end of central dir locator signature
     * @type {number}
     */
    signature = constants.SIGNATURE_END_OF_CENTRAL_DIR_LOCATOR_ZIP64;

    /**
     * Number of the disk with the start of the zip64 end of central directory
     * @type {number}
     */
    centralDirectoryEndDiskNumber;

    /**
     * Relative offset of the zip64 end of central directory record
     * @type {bigint}
     */
    centralDirectoryEndOffset;

    /**
     * Total number of disks
     * @type {number}
     */
    disks;

    /**
     * @inheritDoc
     */
    async read(reader) {
        this.setSignature(await reader.getUint32());
        this.centralDirectoryEndDiskNumber = await reader.getUint32();
        this.centralDirectoryEndOffset = await reader.getBigUint64();
        this.disks = await reader.getUint32();
    }

    /**
     * @inheritDoc
     */
    async serialize() {
        let data = new Uint8Array(constants.LENGTH_END_OF_CENTRAL_DIR_LOCATOR_ZIP64);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        view.setUint32(0, this.signature, true);
        view.setUint32(4, this.centralDirectoryEndDiskNumber, true);
        view.setBigUint64(8, this.centralDirectoryEndOffset, true);
        view.setUint32(16, this.disks, true);
        return data;
    }

    /**
     * @inheritDoc
     */
    static getSignature() {
        return constants.SIGNATURE_END_OF_CENTRAL_DIR_LOCATOR_ZIP64;
    }
}

