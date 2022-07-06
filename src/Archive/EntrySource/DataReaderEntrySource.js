import EntrySource from "./EntrySource.js";
import Constants from "../../Constants.js";
import CRC32 from "../../Util/CRC32.js";
import BigInt from "../../Util/BigInt.js";

export default class DataReaderEntrySource extends EntrySource {
    /** @type {DataReader} */ reader;
    /** @type {DataProcessor} */ compressor;
    /** @type {boolean} */ zip64;
    /** @type {number} */ compressedSize = 0;
    /** @type {boolean} */ eof = false;

    /**
     * @param {DataReader} reader
     * @param {EntrySourceOptions|EntrySourceOptionsObject} options
     */
    constructor(reader, options) {
        if (!options.fileName) {
            throw new Error('Missing required fileName option');
        }
        if (options.fileName.endsWith('/')) {
            options.fileName = options.fileName.substring(0, options.fileName.length - 1);
        }
        super(options);

        this.reader = reader;
        this.compressor = this.getDataProcessor(this.reader);
        this.zip64 = this.options.forceZIP64;
    }

    /**
     * @inheritDoc
     */
    async generateCentralDirectoryFileHeader() {
        let crc = this.compressor.getPreCrc().finish();
        let header = this.getBaseCentralDirectoryFileHeader();
        header.bitFlag = this.getBitFlag();
        header.crc32 = crc;
        header.compressedSize = this.isZip64() ? Constants.MAX_UINT32 : this.compressedSize;
        header.uncompressedSize = this.isZip64() ? Constants.MAX_UINT32 : this.reader.byteLength;

        this.setCommonExtraFields(header, this.reader.byteLength, this.compressedSize, true);

        return header;
    }

    /**
     * @inheritDoc
     */
    async generateDataChunk(length) {
        let compressed = await this.compressor.read(length);
        if(compressed === null) {
            this.eof = true;
            return new Uint8Array(0);
        }
        this.compressedSize += compressed.byteLength;
        return compressed;
    }

    /**
     * @inheritDoc
     */
    async generateDataDescriptor() {
        let descriptor = this.getBaseDataDescriptor();
        descriptor.crc32 = this.compressor.getPreCrc().finish();
        descriptor.compressedSize = BigInt(this.compressedSize);
        descriptor.uncompressedSize = BigInt(this.reader.byteLength);

        return descriptor;
    }

    /**
     * @inheritDoc
     */
    hasDataDescriptor() {
        return true;
    }

    /**
     * @inheritDoc
     */
    async generateLocalFileHeader() {
        this.zip64 = this.zip64 || this.reader.byteLength > Constants.MAX_UINT32 ||
            this.getLocalHeaderOffset() > Constants.MAX_UINT32;
        if (this.zip64) {
            this.madeByVersion = Constants.MIN_VERSION_ZIP64;
            this.extractionVersion = Constants.MIN_VERSION_ZIP64;
        }

        let header = this.getBaseLocalFileHeader();
        header.bitFlag = this.getBitFlag();
        header.crc32 = 0;
        header.compressedSize = this.zip64 ? Constants.MAX_UINT32 : this.compressedSize;
        header.uncompressedSize = this.zip64 ? Constants.MAX_UINT32 : this.reader.byteLength;

        this.setCommonExtraFields(header, this.reader.byteLength, this.compressedSize, false);

        return header;
    }

    /**
     * @inheritDoc
     */
    getDataEOF() {
        return this.eof;
    }

    /**
     * @inheritDoc
     */
    isZip64() {
        return this.zip64;
    }
}

