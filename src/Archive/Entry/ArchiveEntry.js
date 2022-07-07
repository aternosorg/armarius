import Constants from "../../Constants.js";
import CP437 from "../../Util/CP437.js";
import CentralDirectoryFileHeader from "../Structure/CentralDirectoryFileHeader.js";
import EntryReference from "./EntryReference.js";
import ArchiveIndex from "../../Index/ArchiveIndex.js";
import LocalFileHeader from "../Structure/LocalFileHeader.js";
import EntryDataReader from "./EntryDataReader.js";
import MsDosTime from "../../Util/MsDosTime.js";
import EntryOptions from "../../Options/EntryOptions.js";
import BigInt from "../../Util/BigInt.js";

export default class ArchiveEntry {
    /** @type {CentralDirectoryFileHeader} */ centralDirectoryFileHeader;
    /** @type {LocalFileHeader} */ localFileHeader;
    /** @type {number} */ centralDirectoryOffset;
    /** @type {?Zip64ExtendedInformation} */ zip64ExtendedInformation;
    /** @type {UnicodeExtraField} */ unicodeFileName;
    /** @type {UnicodeExtraField} */ unicodeFileComment;
    /** @type {ExtendedTimestamp} */ extendedTimestamp;
    /** @type {ReadArchive} */ archive;
    /** @type {EntryOptions} */ options;
    /** @type {number} */ dataOffset;

    /**
     * @type {?string}
     * @protected
     */
    fileNameString;


    /**
     * @type {?string}
     * @protected
     */
    fileCommentString;

    /**
     * @param {ReadArchive} archive
     * @param {EntryOptions|EntryOptionsObject} options
     */
    constructor(archive, options = {}) {
        this.archive = archive;
        this.options = EntryOptions.from(options);
    }

    /**
     * @param {DataReader} reader
     * @param {number} centralDirectoryOffset
     * @returns {Promise<void>}
     */
    async readCentralDirectoryHeader(reader, centralDirectoryOffset) {
        this.centralDirectoryOffset = centralDirectoryOffset;
        this.centralDirectoryFileHeader = await CentralDirectoryFileHeader.fromReader(reader);
        this.zip64ExtendedInformation = this.centralDirectoryFileHeader.getExtraField(Constants.EXTRAFIELD_TYPE_ZIP64_EXTENDED_INFO);
        this.unicodeFileName = this.centralDirectoryFileHeader.getExtraField(Constants.EXTRAFIELD_TYPE_UNICODE_FILENAME);
        this.unicodeFileComment = this.centralDirectoryFileHeader.getExtraField(Constants.EXTRAFIELD_TYPE_UNICODE_COMMENT);
        this.extendedTimestamp = this.centralDirectoryFileHeader.getExtraField(Constants.EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP);
    }

    /**
     * @returns {Promise<void>}
     */
    async readLocalFileHeader() {
        if (this.localFileHeader) {
            return;
        }
        let localHeaderOffset = this.archive.prependedDataLength + Number(this.getLocalHeaderOffset());
        let reader = await this.archive.getReader(localHeaderOffset);
        this.localFileHeader = await LocalFileHeader.fromReader(reader);
        this.dataOffset = localHeaderOffset + reader.offset;
    }

    /**
     * @returns {Uint8Array}
     */
    getFileNameData() {
        if (this.unicodeFileName?.isValid()) {
            return this.unicodeFileName.data;
        }
        return this.centralDirectoryFileHeader.fileName;
    }

    /**
     * @returns {Uint8Array}
     */
    getFileCommentData() {
        if (this.unicodeFileComment?.isValid()) {
            return this.unicodeFileComment.data;
        }
        return this.centralDirectoryFileHeader.fileComment;
    }

    /**
     * @returns {string}
     */
    getFileNameString() {
        if (!this.fileNameString) {
            this.fileNameString = this.decodeString(this.getFileNameData(), !!this.unicodeFileName?.isValid());
        }
        return this.fileNameString;
    }

    /**
     * @returns {string}
     */
    getFileCommentString() {
        if (!this.fileCommentString) {
            this.fileCommentString = this.decodeString(this.getFileCommentData(), !!this.unicodeFileComment?.isValid());
        }
        return this.fileCommentString;
    }

    /**
     * @param {Uint8Array} data
     * @param {boolean} forceUTF8
     * @protected
     * @returns {string}
     */
    decodeString(data, forceUTF8 = false) {
        if (forceUTF8 || this.centralDirectoryFileHeader.getFlag(Constants.BITFLAG_LANG_ENCODING)) {
            return (new TextDecoder()).decode(data);
        } else {
            return CP437.decode(data);
        }
    }

    /**
     * Get the last modified timestamp of a file
     * @returns {Date}
     */
    getLastModDate() {
        let ext = this.extendedTimestamp?.getModTime();
        if (ext) {
            return new Date(ext * 1000);
        }
        return MsDosTime.decode(this.centralDirectoryFileHeader.fileModDate, this.centralDirectoryFileHeader.fileModTime);
    }

    /**
     * @returns {BigInt}
     */
    getLocalHeaderOffset() {
        if (this.zip64ExtendedInformation) {
            return this.zip64ExtendedInformation.localHeaderOffset;
        }
        return BigInt(this.centralDirectoryFileHeader.localHeaderOffset);
    }

    /**
     * @returns {BigInt}
     */
    getCompressedSize() {
        if (this.zip64ExtendedInformation) {
            return this.zip64ExtendedInformation.compressedSize;
        }
        return BigInt(this.centralDirectoryFileHeader.compressedSize);
    }

    /**
     * @returns {BigInt}
     */
    getUncompressedSize() {
        if (this.zip64ExtendedInformation) {
            return this.zip64ExtendedInformation.uncompressedSize;
        }
        return BigInt(this.centralDirectoryFileHeader.uncompressedSize);
    }

    /**
     * @returns {number}
     */
    getCrc() {
        return this.centralDirectoryFileHeader.crc32;
    }

    /**
     * @returns {boolean}
     */
    isDirectory() {
        return ((this.centralDirectoryFileHeader.bitFlag & 0xff) & Constants.BITFLAG_MSDOS_DIR) === Constants.BITFLAG_MSDOS_DIR ||
            this.getFileNameString().endsWith('/');
    }

    /**
     * @returns {EntryReference}
     */
    getReference() {
        return new EntryReference(this.archive, this.centralDirectoryOffset, ArchiveIndex.getFilenameCrc(this.getFileNameString()));
    }

    /**
     * @protected
     * @returns {Promise<DataProcessor>}
     */
    async getDataProcessor() {
        let Processor = this.options.dataProcessors.get(this.centralDirectoryFileHeader.compressionMethod);
        if(!Processor) {
            throw new Error(`Unsupported compression method ${this.centralDirectoryFileHeader.compressionMethod}`);
        }
        return new Processor(await this.getRawDataReader(), false, true);
    }

    /**
     * @returns {Promise<DataReader>}
     */
    async getRawDataReader() {
        await this.readLocalFileHeader();
        return await this.archive.getReader(this.dataOffset, Number(this.getCompressedSize()));
    }

    /**
     * @returns {Promise<EntryDataReader>}
     */
    async getDataReader() {
        if (this.isDirectory()) {
            throw new Error(`Cannot create data reader: ${this.getFileNameString()} is a directory`);
        }
        await this.readLocalFileHeader();
        return new EntryDataReader(
            await this.getDataProcessor(),
            this.centralDirectoryFileHeader.crc32
        );
    }

    /**
     * @param {number} chunkSize
     * @returns {Promise<Uint8Array>}
     */
    async getData(chunkSize = 1024 * 64) {
        let res = new Uint8Array(Number(this.getUncompressedSize()));
        let offset = 0;
        let reader = await this.getDataReader();
        while (!reader.eof) {
            let chunk = await reader.read(chunkSize);
            res.set(chunk, offset);
            offset += chunk.byteLength;
        }

        return res;
    }

    /**
     * @param {ReadArchive} archive
     * @param {DataReader} centralDirectoryEntryReader
     * @param {number} centralDirectoryEntryOffset
     * @returns {Promise<ArchiveEntry>}
     */
    static async load(archive, centralDirectoryEntryReader, centralDirectoryEntryOffset) {
        let entry = new this(archive, archive.options.entryOptions);
        await entry.readCentralDirectoryHeader(centralDirectoryEntryReader, centralDirectoryEntryOffset);
        return entry;
    }
}

