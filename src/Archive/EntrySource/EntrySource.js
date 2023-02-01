import Constants from '../../Constants.js';
import ExtendedTimestamp from '../Structure/ExtraField/ExtendedTimestamp.js';
import EntrySourceOptions from '../../Options/EntrySourceOptions.js';
import CP437 from '../../Util/CP437.js';
import LocalFileHeader from '../Structure/LocalFileHeader.js';
import CentralDirectoryFileHeader from '../Structure/CentralDirectoryFileHeader.js';
import Zip64ExtendedInformation from '../Structure/ExtraField/Zip64ExtendedInformation.js';
import DataDescriptor64 from '../Structure/DataDescriptor64.js';
import DataDescriptor from '../Structure/DataDescriptor.js';
import UnicodeExtraField from '../Structure/ExtraField/UnicodeExtraField.js';
import MsDosTime from '../../Util/MsDosTime.js';
import BigInt from '../../Util/BigInt.js';
import {CRC32} from '../../../index.js';
import FeatureError from '../../Error/FeatureError.js';

const encoder = new TextEncoder();

/**
 * @abstract
 */
export default class EntrySource {
    /** @type {number} */ localHeaderOffset;
    /** @type {?Uint8Array} */ fileNameUtf8 = null;
    /** @type {?Uint8Array} */ fileNameCP437 = null;
    /** @type {?Uint8Array} */ fileCommentUtf8 = null;
    /** @type {?Uint8Array} */ fileCommentCP437 = null;
    /** @type {?string} */ fileNameString = null;
    /** @type {?string} */ fileCommentString = null;
    /** @type {boolean} */ utf8Strings = false;
    /** @type {number} */ madeByVersion;
    /** @type {number} */ extractionVersion;
    /** @type {EntrySourceOptions} */ options;
    /** @type {Date} */ modTime;
    /** @type {Date} */ acTime;
    /** @type {Date} */ crTime;

    /**
     * @param {EntrySourceOptions|EntrySourceOptionsObject} options
     */
    constructor(options) {
        this.options = EntrySourceOptions.from(options);

        this.madeByVersion = this.options.minMadeByVersion;
        this.extractionVersion = this.options.minExtractionVersion;

        if (this.options.fileName !== null) {
            this.setFileNameString(this.options.fileName);
        }
        if (this.options.fileComment !== null) {
            this.setFileCommentString(this.options.fileComment);
        }

        this.modTime = this.options.modTime;
        this.acTime = this.options.acTime;
        this.crTime = this.options.crTime;
    }

    /**
     * @param {string} fileName
     * @return {this}
     */
    setFileNameString(fileName) {
        this.fileNameString = fileName;
        this.fileNameUtf8 = null;
        this.fileNameCP437 = null;

        if (this.options.forceUTF8FileName || !CP437.canBeEncoded(fileName)) {
            this.utf8Strings = true;
        }

        return this;
    }

    /**
     * @param {string} fileComment
     * @return {this}
     */
    setFileCommentString(fileComment) {
        this.fileCommentString = fileComment;
        this.fileCommentUtf8 = null;
        this.fileCommentCP437 = null;

        if (this.options.forceUTF8FileName || !CP437.canBeEncoded(fileComment)) {
            this.utf8Strings = true;
        }

        return this;
    }

    /**
     * @return {Uint8Array}
     */
    getFileNameUtf8() {
        if (this.fileNameUtf8 === null) {
            this.fileNameUtf8 = encoder.encode(this.fileNameString ?? '');
        }
        return this.fileNameUtf8;
    }

    /**
     * @return {Uint8Array}
     */
    getFileCommentUtf8() {
        if (this.fileCommentUtf8 === null) {
            this.fileCommentUtf8 = encoder.encode(this.fileCommentString ?? '');
        }
        return this.fileCommentUtf8;
    }

    /**
     * @return {Uint8Array}
     */
    getFileNameCP437() {
        if (this.fileNameCP437 === null) {
            this.fileNameCP437 = CP437.encode(this.fileNameString ?? '');
        }
        return this.fileNameCP437;
    }

    /**
     * @return {Uint8Array}
     */
    getFileCommentCP437() {
        if (this.fileCommentCP437 === null) {
            this.fileCommentCP437 = CP437.encode(this.fileCommentString ?? '');
        }
        return this.fileCommentCP437;
    }

    /**
     * @return {Uint8Array}
     */
    getFileName() {
        return this.utf8Strings ? this.getFileNameUtf8() : this.getFileNameCP437();
    }

    /**
     * @return {Uint8Array}
     */
    getFileComment() {
        return this.utf8Strings ? this.getFileCommentUtf8() : this.getFileCommentCP437();
    }

    /**
     * @param {number} offset
     */
    setLocalHeaderOffset(offset) {
        this.localHeaderOffset = offset;
    }

    /**
     * @returns {number}
     */
    getLocalHeaderOffset() {
        return this.localHeaderOffset;
    }

    /**
     * @protected
     * @returns {LocalFileHeader}
     */
    getBaseLocalFileHeader() {
        let header = new LocalFileHeader();
        header.extractionVersion = this.extractionVersion;
        header.compressionMethod = this.options.compressionMethod;
        header.fileModDate = MsDosTime.encodeDate(this.modTime);
        header.fileModTime = MsDosTime.encodeTime(this.modTime);
        header.fileName = this.getFileName();
        header.fileComment = this.getFileComment();
        return header;
    }

    /**
     * @returns {Promise<LocalFileHeader>}
     * @abstract
     */
    async generateLocalFileHeader() {

    }

    /**
     * @param {number} length
     * @returns {Promise<Uint8Array>}
     * @abstract
     */
    async generateDataChunk(length) {

    }

    /**
     * @returns {boolean}
     * @abstract
     */
    getDataEOF() {

    }

    /**
     * @protected
     * @returns {DataDescriptor}
     */
    getBaseDataDescriptor() {
        return this.isZip64() ? new DataDescriptor64() : new DataDescriptor();
    }

    /**
     * @returns {Promise<?DataDescriptor>}
     * @abstract
     */
    async generateDataDescriptor() {

    }

    /**
     * @protected
     * @returns {CentralDirectoryFileHeader}
     */
    getBaseCentralDirectoryFileHeader() {
        let header = new CentralDirectoryFileHeader();
        header.madeByVersion = this.madeByVersion;
        header.extractionVersion = this.extractionVersion;
        header.compressionMethod = this.options.compressionMethod;
        header.fileModDate = MsDosTime.encodeDate(this.modTime);
        header.fileModTime = MsDosTime.encodeTime(this.modTime);
        header.diskNumberStart = 0;
        header.internalFileAttributes = this.options.internalFileAttributes;
        header.externalFileAttributes = this.options.externalFileAttributes;
        header.localHeaderOffset = this.isZip64() ? Constants.MAX_UINT32 : this.getLocalHeaderOffset();
        header.fileName = this.getFileName();
        header.fileComment = this.getFileComment();
        return header;
    }

    /**
     * @param {FileHeader} header
     * @param {number|BigInt} uncompressedSize
     * @param {number|BigInt} compressedSize
     * @param {boolean} centralDir
     * @protected
     */
    setCommonExtraFields(header, uncompressedSize, compressedSize, centralDir = false) {
        if (this.isZip64()) {
            header.setExtraField(Constants.EXTRAFIELD_TYPE_ZIP64_EXTENDED_INFO, this.getZip64Field(uncompressedSize, compressedSize));
        }
        if (this.options.extendedTimeStampField) {
            header.setExtraField(Constants.EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP,
                this.getExtendedTimeField(centralDir));
        }
        if (this.options.unicodeFileNameField) {
            header.setExtraField(Constants.EXTRAFIELD_TYPE_UNICODE_FILENAME, this.getUnicodeFileNameField());
        }
        if (this.options.unicodeCommentField) {
            header.setExtraField(Constants.EXTRAFIELD_TYPE_UNICODE_COMMENT, this.getUnicodeCommentField());
        }
    }

    /**
     * @param {number|BigInt} uncompressedSize
     * @param {number|BigInt} compressedSize
     * @protected
     * @returns {Zip64ExtendedInformation}
     */
    getZip64Field(uncompressedSize, compressedSize) {
        let zip64Field = new Zip64ExtendedInformation();
        zip64Field.uncompressedSize = BigInt(uncompressedSize);
        zip64Field.compressedSize = BigInt(compressedSize);
        zip64Field.localHeaderOffset = BigInt(this.getLocalHeaderOffset());
        zip64Field.diskNumberStart = 0;
        return zip64Field;
    }

    /**
     * @protected
     * @returns {UnicodeExtraField}
     */
    getUnicodeFileNameField() {
        let field = new UnicodeExtraField();
        field.data = this.getFileNameUtf8();
        field.crc32 = CRC32.hash(this.getFileName());
        return field;
    }

    /**
     * @protected
     * @returns {UnicodeExtraField}
     */
    getUnicodeCommentField() {
        let field = new UnicodeExtraField();
        field.data = this.getFileCommentUtf8();
        field.crc32 = CRC32.hash(this.getFileComment());
        return field;
    }

    /**
     * @returns {Promise<CentralDirectoryFileHeader>}
     * @abstract
     */
    async generateCentralDirectoryFileHeader() {

    }

    /**
     * @returns {boolean}
     */
    isZip64() {
        return this.options.forceZIP64;
    }

    /**
     * @param {DataReader} reader
     * @param {number} method
     * @protected
     * @returns {DataProcessor}
     */
    getDataProcessor(reader, method = this.options.compressionMethod) {
        let Processor = this.options.dataProcessors.get(method);
        if (!Processor) {
            throw new FeatureError(`Unsupported compression method ${method}`);
        }
        return new Processor(reader, true);
    }

    /**
     * @param {boolean} centralDir
     * @protected
     * @returns {ExtendedTimestamp}
     */
    getExtendedTimeField(centralDir = false) {
        let field = new ExtendedTimestamp();
        field.modTime = Math.floor(this.modTime.getTime() / 1000);
        field.acTime = Math.floor(this.acTime.getTime() / 1000);
        field.crTime = Math.floor(this.crTime.getTime() / 1000);
        field.bitFlag = 0x1 | 0x2 | 0x4;
        field.setCentralDirMode(centralDir);
        return field;
    }

    /**
     * @param {number} base
     * @protected
     * @returns {number}
     */
    getBitFlag(base = 0) {
        if (this.utf8Strings) {
            base |= Constants.BITFLAG_LANG_ENCODING;
        } else {
            base &= ~Constants.BITFLAG_LANG_ENCODING;
        }

        if (this.hasDataDescriptor()) {
            base |= Constants.BITFLAG_DATA_DESCRIPTOR;
        } else {
            base &= ~Constants.BITFLAG_DATA_DESCRIPTOR;
        }
        return base;
    }

    /**
     * @returns {boolean}
     * @abstract
     */
    hasDataDescriptor() {
    }

    /**
     * @returns {string}
     */
    getFileNameString() {
        return this.fileNameString;
    }
}

