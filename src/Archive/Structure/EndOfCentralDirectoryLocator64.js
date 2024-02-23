import SignatureStructure from "./SignatureStructure.js";
import Constants from "../../Constants.js";
import {BigIntUtils} from "armarius-io";

/**
 * Zip64 end of central directory locator
 */
export default class EndOfCentralDirectoryLocator64 extends SignatureStructure {
    /**
     * Zip64 end of central dir locator signature
     * @type {number}
     */
    signature = Constants.SIGNATURE_END_OF_CENTRAL_DIR_LOCATOR_ZIP64;

    /**
     * Number of the disk with the start of the zip64 end of central directory
     * @type {number}
     */
    centralDirectoryEndDiskNumber;

    /**
     * Relative offset of the zip64 end of central directory record
     * @type {BigInt}
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
        let data = new Uint8Array(Constants.LENGTH_END_OF_CENTRAL_DIR_LOCATOR_ZIP64);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        view.setUint32(0, this.signature, true);
        view.setUint32(4, this.centralDirectoryEndDiskNumber, true);
        BigIntUtils.setBigUint64InView(view, 8, this.centralDirectoryEndOffset, true);
        view.setUint32(16, this.disks, true);
        return data;
    }

    /**
     * @inheritDoc
     */
    static getSignature() {
        return Constants.SIGNATURE_END_OF_CENTRAL_DIR_LOCATOR_ZIP64;
    }
}

