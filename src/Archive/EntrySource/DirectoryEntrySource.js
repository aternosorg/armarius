import EntrySource from "./EntrySource.js";
import Constants from "../../Constants.js";

export default class DirectoryEntrySource extends EntrySource {
    /** @type {boolean} */ zip64;

    /**
     * @param {EntrySourceOptions|EntrySourceOptionsObject} options
     */
    constructor(options) {
        if (!options.fileName) {
            throw new Error('Missing required fileName option');
        }
        if (!options.fileName.endsWith('/')) {
            options.fileName += '/';
        }
        super(options);
    }

    /**
     * @inheritDoc
     */
    async generateCentralDirectoryFileHeader() {
        let header = this.getBaseCentralDirectoryFileHeader();
        header.bitFlag = this.getBitFlag();
        header.crc32 = 0;
        header.compressedSize = this.zip64 ? Constants.MAX_UINT32 : 0;
        header.uncompressedSize = this.zip64 ? Constants.MAX_UINT32 : 4096;

        this.setCommonExtraFields(header, 4096, 0, true);

        return header;
    }

    /**
     * @inheritDoc
     */
    async generateDataChunk(length) {
        return new Uint8Array(0);
    }

    /**
     * @inheritDoc
     */
    async generateDataDescriptor() {
        return null;
    }

    /**
     * @inheritDoc
     */
    async generateLocalFileHeader() {
        this.zip64 = this.getLocalHeaderOffset() > Constants.MAX_UINT32;
        if (this.isZip64()) {
            this.madeByVersion = Constants.MIN_VERSION_ZIP64;
            this.extractionVersion = Constants.MIN_VERSION_ZIP64;
        }

        let header = this.getBaseLocalFileHeader();
        header.bitFlag = this.getBitFlag();
        header.crc32 = 0;
        header.compressedSize = this.zip64 ? Constants.MAX_UINT32 : 0;
        header.uncompressedSize = this.zip64 ? Constants.MAX_UINT32 : 4096;

        this.setCommonExtraFields(header, 4096, 0, false);

        return header;
    }

    /**
     * @inheritDoc
     */
    getDataEOF() {
        return true;
    }

    /**
     * @inheritDoc
     */
    isZip64() {
        return super.isZip64() || this.zip64;
    }

    /**
     * @returns {boolean}
     */
    hasDataDescriptor() {
        return false;
    }
}

