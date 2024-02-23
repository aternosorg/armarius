import Constants from '../../Constants.js';
import CP437 from '../../Util/CP437.js';
import CentralDirectoryFileHeader from '../Structure/CentralDirectoryFileHeader.js';
import EntryReference from './EntryReference.js';
import ArchiveIndex from '../../Index/ArchiveIndex.js';
import LocalFileHeader from '../Structure/LocalFileHeader.js';
import EntryDataReader from './EntryDataReader.js';
import MsDosTime from '../../Util/MsDosTime.js';
import EntryOptions from '../../Options/EntryOptions.js';
import {BigInt, CRC32} from 'armarius-io';
import FeatureError from '../../Error/FeatureError.js';
import ArmariusError from '../../Error/ArmariusError.js';

const decoder = new TextDecoder();

export default class ArchiveEntry {
    /** @type {CentralDirectoryFileHeader} */ centralDirectoryFileHeader;
    /** @type {LocalFileHeader} */ localFileHeader;
    /** @type {number} */ centralDirectoryOffset;
    /** @type {?Zip64ExtendedInformation} */ zip64ExtendedInformation;
    /** @type {?number} */ fileNameCrc = null;
    /** @type {?number} */ fileCommentCrc = null;
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
     * @param {import("armarius-io").IO} io
     * @param {number} centralDirectoryOffset
     * @returns {Promise<void>}
     */
    async readCentralDirectoryHeader(io, centralDirectoryOffset) {
        this.centralDirectoryOffset = centralDirectoryOffset;
        this.centralDirectoryFileHeader = await CentralDirectoryFileHeader.fromIO(io);
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
        this.localFileHeader = await LocalFileHeader.fromIO(reader);
        this.dataOffset = localHeaderOffset + reader.offset;
    }

    /**
     * @return {number}
     */
    getFileNameCrc() {
        if (this.fileNameCrc === null) {
            this.fileNameCrc = CRC32.hash(this.centralDirectoryFileHeader.fileName);
        }
        return this.fileNameCrc;
    }

    /**
     * @return {number}
     */
    getFileCommentCrc() {
        if (this.fileCommentCrc === null) {
            this.fileCommentCrc = CRC32.hash(this.centralDirectoryFileHeader.fileComment);
        }
        return this.fileCommentCrc;
    }

    /**
     * @return {boolean}
     */
    hasUTF8Strings() {
        return this.centralDirectoryFileHeader.getFlag(Constants.BITFLAG_LANG_ENCODING);
    }

    /**
     * @returns {string}
     */
    getFileNameString() {
        if (this.fileNameString === null) {
            return this.fileNameString;
        }

        let data = this.centralDirectoryFileHeader.fileName;
        let utf8 = this.hasUTF8Strings();
        if (this.unicodeFileName && this.unicodeFileName.crc32 === this.getFileNameCrc()) {
            data = this.unicodeFileName.data;
            utf8 = true;
        }

        let name = utf8 ? decoder.decode(data) : CP437.decode(data);
        while (name.startsWith('/')) {
            name = name.substring(1);
        }
        this.fileNameString = name;
        return this.fileNameString;
    }

    /**
     * @returns {string}
     */
    getFileCommentString() {
        if (this.fileCommentString === null) {
            return this.fileCommentString;
        }

        let data = this.centralDirectoryFileHeader.fileComment;
        let utf8 = this.hasUTF8Strings();
        if (this.unicodeFileComment && this.unicodeFileComment.crc32 === this.getFileCommentCrc()) {
            data = this.unicodeFileComment.data;
            utf8 = true;
        }

        this.fileCommentString = utf8 ? decoder.decode(data) : CP437.decode(data);
        return this.fileCommentString;
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
        if (!Processor) {
            throw new FeatureError(`Unsupported compression method ${this.centralDirectoryFileHeader.compressionMethod}`);
        }
        return new Processor(await this.getRawDataReader(), false, true);
    }

    /**
     * @returns {Promise<import("armarius-io").IO>}
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
            throw new ArmariusError(`Cannot create data reader: ${this.getFileNameString()} is a directory`);
        }
        await this.readLocalFileHeader();
        return new EntryDataReader(
            await this.getDataProcessor(),
            this.centralDirectoryFileHeader.crc32,
            Number(this.getUncompressedSize())
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

        let chunk;
        while ((chunk = await reader.read(chunkSize)) !== null) {
            res.set(chunk, offset);
            offset += chunk.byteLength;
        }

        return res;
    }

    /**
     * @param {ReadArchive} archive
     * @param {import("armarius-io").IO} centralDirectoryEntryReader
     * @param {number} centralDirectoryEntryOffset
     * @returns {Promise<ArchiveEntry>}
     */
    static async load(archive, centralDirectoryEntryReader, centralDirectoryEntryOffset) {
        let entry = new this(archive, archive.options.entryOptions);
        await entry.readCentralDirectoryHeader(centralDirectoryEntryReader, centralDirectoryEntryOffset);
        return entry;
    }
}

