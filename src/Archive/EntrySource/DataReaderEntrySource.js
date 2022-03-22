import EntrySource from "./EntrySource.js";
import constants from "../../constants.js";
import CRC32 from "../../Util/CRC32.js";

export default class DataReaderEntrySource extends EntrySource {
    /** @type {DataReader} */ reader;
    /** @type {DataProcessor} */ compressor;
    /** @type {boolean} */ zip64;
    /** @type {CRC32} */ dataCrc32;
    /** @type {number} */ compressedSize = 0;

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
        this.dataCrc32 = new CRC32();
        this.compressor = this.getDataProcessor();
    }

    /**
     * @inheritDoc
     */
    async generateCentralDirectoryFileHeader() {
        let crc = this.dataCrc32.finish();
        let header = this.getBaseCentralDirectoryFileHeader();
        header.bitFlag = this.getBitFlag();
        header.crc32 = crc;
        header.compressedSize = this.isZip64() ? constants.MAX_UINT32 : this.compressedSize;
        header.uncompressedSize = this.isZip64() ? constants.MAX_UINT32 : this.reader.byteLength;

        this.setCommonExtraFields(header, this.reader.byteLength, this.compressedSize, true);

        return header;
    }

    /**
     * @inheritDoc
     */
    async generateDataChunk(length) {
        let chunk = await this.reader.read(Math.min(length, this.reader.byteLength - this.reader.offset));
        this.dataCrc32.add(chunk);
        let compressed = await this.compressor.process(chunk, this.getDataEOF());
        this.compressedSize += compressed.byteLength;
        return compressed;
    }

    /**
     * @inheritDoc
     */
    async generateDataDescriptor() {
        let descriptor = this.getBaseDataDescriptor();
        descriptor.crc32 = this.dataCrc32.finish();
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
        this.zip64 = this.reader.byteLength > constants.MAX_UINT32 ||
            this.getLocalHeaderOffset() > constants.MAX_UINT32;
        if (this.zip64) {
            this.madeByVersion = constants.MIN_VERSION_ZIP64;
            this.extractionVersion = constants.MIN_VERSION_ZIP64;
        }

        let header = this.getBaseLocalFileHeader();
        header.bitFlag = this.getBitFlag();
        header.crc32 = 0;
        header.compressedSize = this.zip64 ? constants.MAX_UINT32 : this.compressedSize;
        header.uncompressedSize = this.zip64 ? constants.MAX_UINT32 : this.reader.byteLength;

        this.setCommonExtraFields(header, this.reader.byteLength, this.compressedSize, false);

        return header;
    }

    /**
     * @inheritDoc
     */
    getDataEOF() {
        return this.reader.offset >= this.reader.byteLength;
    }

    /**
     * @inheritDoc
     */
    isZip64() {
        return this.zip64;
    }
}

