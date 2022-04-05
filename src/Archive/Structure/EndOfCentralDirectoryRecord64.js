import SignatureStructure from "./SignatureStructure.js";
import Constants from "../../Constants.js";
import BigInt from "../../Util/BigInt.js";

/**
 * Zip64 end of central directory record
 */
export default class EndOfCentralDirectoryRecord64 extends SignatureStructure {
    /**
     * Zip64 end of central dir signature
     * @type {number}
     */
    signature = Constants.SIGNATURE_END_OF_CENTRAL_DIR_ZIP64;

    /**
     * Size of zip64 end of central directory record (not including signature and this field)
     *
     * This value is ignored in serialization.
     * Instead, the correct value is calculated.
     * @type {bigint}
     */
    centralDirectoryEndSize;

    /**
     * Version made by
     * @type {number}
     */
    madeByVersion;

    /**
     * Version needed to extract
     * @type {number}
     */
    extractionVersion;

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
     * @type {bigint}
     */
    diskCentralDirectoryEntries;

    /**
     * Total number of entries in the central directory
     * @type {bigint}
     */
    centralDirectoryEntries;

    /**
     * Size of the central directory
     * @type {bigint}
     */
    centralDirectorySize;

    /**
     * Offset of start of central directory with respect to the starting disk number
     * @type {bigint}
     */
    centralDirectoryOffset;

    /**
     * Zip64 extensible data sector
     * @type {Uint8Array}
     */
    extensibleDataSector;

    /**
     * @inheritDoc
     */
    async read(reader) {
        this.setSignature(await reader.getUint32());
        this.centralDirectoryEndSize = await reader.getBigUint64();
        this.madeByVersion = await reader.getUint16();
        this.extractionVersion = await reader.getUint16();
        this.diskNumber = await reader.getUint32();
        this.centralDirectoryDiskNumber = await reader.getUint32();
        this.diskCentralDirectoryEntries = await reader.getBigUint64();
        this.centralDirectoryEntries = await reader.getBigUint64();
        this.centralDirectorySize = await reader.getBigUint64();
        this.centralDirectoryOffset = await reader.getBigUint64();
        this.extensibleDataSector = await reader.read(Number(this.centralDirectoryEndSize - BigInt(44)));
    }

    /**
     * @inheritDoc
     */
    async serialize() {
        let data = new Uint8Array(Constants.LENGTH_END_OF_CENTRAL_DIR_ZIP64 + this.extensibleDataSector.byteLength);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        view.setUint32(0, this.signature, true);
        view.setBigUint64(
            4,
            BigInt(Constants.LENGTH_END_OF_CENTRAL_DIR_ZIP64 + this.extensibleDataSector.byteLength - 12),
            true
        );
        view.setUint16(12, this.madeByVersion, true);
        view.setUint16(14, this.extractionVersion, true);
        view.setUint32(16, this.diskNumber, true);
        view.setUint32(20, this.centralDirectoryDiskNumber, true);
        view.setBigUint64(24, this.diskCentralDirectoryEntries, true);
        view.setBigUint64(32, this.centralDirectoryEntries, true);
        view.setBigUint64(40, this.centralDirectorySize, true);
        view.setBigUint64(48, this.centralDirectoryOffset, true);
        data.set(this.extensibleDataSector, 56);
        return data;
    }

    /**
     * @inheritDoc
     */
    static getSignature() {
        return Constants.SIGNATURE_END_OF_CENTRAL_DIR_ZIP64;
    }
}

