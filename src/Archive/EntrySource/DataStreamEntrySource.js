import EntrySource from "./EntrySource.js";
import Constants from "../../Constants.js";
import OptionError from '../../Error/OptionError.js';

export default class DataStreamEntrySource extends EntrySource {
    /** @type {import("armarius-io").DataStream} */ dataStream;
    /** @type {DataProcessor} */ compressor;
    /** @type {boolean} */ zip64;
    /** @type {number} */ compressedSize = 0;
    /** @type {boolean} */ eof = false;

    /**
     * @param {import("armarius-io").DataStream} dataStream
     * @param {EntrySourceOptions|EntrySourceOptionsObject} options
     */
    constructor(dataStream, options) {
        if (!options.fileName) {
            throw new OptionError('Missing required fileName option');
        }
        if (options.fileName.endsWith('/')) {
            options.fileName = options.fileName.substring(0, options.fileName.length - 1);
        }
        super(options);

        this.dataStream = dataStream;
        this.compressor = this.getDataProcessor(this.dataStream);
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
        header.compressedSize = this.isZip64() ? Constants.MAX_UINT32 : Number(this.compressor.getPostLength());
        header.uncompressedSize = this.isZip64() ? Constants.MAX_UINT32 : Number(this.compressor.getPreLength());

        this.setCommonExtraFields(header, this.compressor.getPreLength(), this.compressor.getPostLength(), true);

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
        return compressed;
    }

    /**
     * @inheritDoc
     */
    async generateDataDescriptor() {
        let descriptor = this.getBaseDataDescriptor();
        descriptor.crc32 = this.compressor.getPreCrc().finish();
        descriptor.compressedSize = this.compressor.getPostLength();
        descriptor.uncompressedSize = this.compressor.getPreLength();

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
        let dataLength = this.dataStream.getFinalLength();
        // If the length is unknown, or if it's greater than 4GB, we need to use ZIP64
        this.zip64 = this.zip64 || dataLength === null || dataLength > Constants.MAX_UINT32 ||
            this.getLocalHeaderOffset() > Constants.MAX_UINT32;
        if (this.zip64) {
            this.madeByVersion = Constants.MIN_VERSION_ZIP64;
            this.extractionVersion = Constants.MIN_VERSION_ZIP64;
        }

        let header = this.getBaseLocalFileHeader();
        header.bitFlag = this.getBitFlag();
        header.crc32 = 0;
        header.compressedSize = this.zip64 ? Constants.MAX_UINT32 : Number(this.compressor.getPostLength());
        header.uncompressedSize = this.zip64 ? Constants.MAX_UINT32 : Number(this.compressor.getPreLength());

        this.setCommonExtraFields(header, this.compressor.getPreLength(), this.compressor.getPostLength(), false);

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

