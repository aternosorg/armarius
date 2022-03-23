import constants from "../../constants.js";
import ExtendedTimestamp from "../Structure/ExtraField/ExtendedTimestamp.js";
import EntrySourceOptions from "../../Options/EntrySourceOptions.js";
import CP437 from "../../Util/CP437.js";
import LocalFileHeader from "../Structure/LocalFileHeader.js";
import CentralDirectoryFileHeader from "../Structure/CentralDirectoryFileHeader.js";
import Zip64ExtendedInformation from "../Structure/ExtraField/Zip64ExtendedInformation.js";
import DataDescriptor64 from "../Structure/DataDescriptor64.js";
import DataDescriptor from "../Structure/DataDescriptor.js";
import UnicodeExtraField from "../Structure/ExtraField/UnicodeExtraField.js";
import MsDosTime from "../../Util/MsDosTime.js";
import BigInt from "../../Util/BigInt";

/**
 * @abstract
 */
export default class EntrySource {
    /** @type {number} */ localHeaderOffset;
    /** @type {?Uint8Array} */ fileName;
    /** @type {?Uint8Array} */ fileComment;
    /** @type {?string} */ fileNameString;
    /** @type {?string} */ fileCommentString;
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
        this.encodeStrings(this.options.fileName, this.options.fileComment);

        this.modTime = this.options.modTime;
        this.acTime = this.options.acTime;
        this.crTime = this.options.crTime;
    }

    /**
     * @param {?string} fileName
     * @param {?string} fileComment
     * @protected
     */
    encodeStrings(fileName, fileComment) {
        this.fileNameString = fileName;
        this.fileCommentString = fileComment;
        if (this.options.forceUTF8FileName ||
            !CP437.canBeEncoded(fileName ?? '') ||
            !CP437.canBeEncoded(fileComment ?? '')) {
            let encoder = new TextEncoder();
            this.utf8Strings = true;
            this.fileName = fileName ? encoder.encode(fileName) : null;
            this.fileComment = fileComment ? encoder.encode(fileComment) : null;
        } else {
            this.fileName = fileName ? CP437.encode(fileName) : null;
            this.fileComment = fileComment ? CP437.encode(fileComment) : null;
        }
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
        header.fileName = this.fileName;
        header.fileComment = this.fileComment ?? new Uint8Array(0);
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
        header.localHeaderOffset = this.isZip64() ? constants.MAX_UINT32 : this.getLocalHeaderOffset();
        header.fileName = this.fileName;
        header.fileComment = this.fileComment ?? new Uint8Array(0);
        return header;
    }

    /**
     * @param {FileHeader} header
     * @param {number|bigint} uncompressedSize
     * @param {number|bigint} compressedSize
     * @param {boolean} centralDir
     * @protected
     */
    setCommonExtraFields(header, uncompressedSize, compressedSize, centralDir = false) {
        if (this.isZip64()) {
            header.setExtraField(constants.EXTRAFIELD_TYPE_ZIP64_EXTENDED_INFO, this.getZip64Field(uncompressedSize, compressedSize));
        }
        if (this.options.extendedTimeStampField) {
            header.setExtraField(constants.EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP,
                this.getExtendedTimeField(centralDir));
        }
        if (this.options.unicodeFileNameField) {
            header.setExtraField(constants.EXTRAFIELD_TYPE_UNICODE_FILENAME, this.getUnicodeFileNameField());
        }
        if (this.options.unicodeCommentField) {
            header.setExtraField(constants.EXTRAFIELD_TYPE_UNICODE_COMMENT, this.getUnicodeCommentField());
        }
    }

    /**
     * @param {number|bigint} uncompressedSize
     * @param {number|bigint} compressedSize
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
        field.data = this.utf8Strings ? this.fileName : (new TextEncoder()).encode(this.fileNameString);
        return field;
    }

    /**
     * @protected
     * @returns {UnicodeExtraField}
     */
    getUnicodeCommentField() {
        let field = new UnicodeExtraField();
        field.data = this.utf8Strings ? this.fileComment : (new TextEncoder()).encode(this.fileCommentString);
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
     * @protected
     * @returns {DataProcessor}
     */
    getDataProcessor(method = this.options.compressionMethod) {
        let Processor = this.options.dataProcessors.get(method);
        if(!Processor) {
            throw new Error(`Unsupported compression method ${method}`);
        }
        return new Processor();
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
            base |= constants.BITFLAG_LANG_ENCODING;
        } else {
            base &= ~constants.BITFLAG_LANG_ENCODING;
        }

        if (this.hasDataDescriptor()) {
            base |= constants.BITFLAG_DATA_DESCRIPTOR;
        } else {
            base &= ~constants.BITFLAG_DATA_DESCRIPTOR;
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

