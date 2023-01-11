import EntrySource from './EntrySource.js';
import Constants from '../../Constants.js';
import GenericExtraField from '../Structure/ExtraField/GenericExtraField.js';

export default class ArchiveEntryEntrySource extends EntrySource {
    /** @type {ArchiveEntry} */ sourceEntry;
    /** @type {DataReader} */ entryDataReader;
    /** @type {boolean} */ zip64;

    /**
     * @param {ArchiveEntry} sourceEntry
     * @param {EntrySourceOptions|EntrySourceOptionsObject} options
     */
    constructor(sourceEntry, options = {}) {
        super(options);
        this.sourceEntry = sourceEntry;
        if (this.fileNameString === null) {
            this.setFileNameString(sourceEntry.getFileNameString());
        }
        if (this.fileCommentString === null) {
            this.setFileCommentString(sourceEntry.getFileCommentString());
        }

        this.madeByVersion = Math.max(this.madeByVersion, sourceEntry.centralDirectoryFileHeader.madeByVersion);
        this.extractionVersion = Math.max(this.extractionVersion, sourceEntry.centralDirectoryFileHeader.extractionVersion);

        this.zip64 = !!sourceEntry.zip64ExtendedInformation;
        this.options.unicodeFileNameField = this.options.unicodeFileNameField || !!this.sourceEntry.unicodeFileName;
        this.options.unicodeCommentField = this.options.unicodeCommentField || !!this.sourceEntry.unicodeFileComment;

        this.modTime = sourceEntry.getLastModDate();
        if (sourceEntry.extendedTimestamp) {
            this.acTime = this.getDateOrDefault(sourceEntry.extendedTimestamp.getAcTime(), this.acTime);
            this.crTime = this.getDateOrDefault(sourceEntry.extendedTimestamp.getCrTime(), this.crTime);
        } else {
            this.crTime = this.modTime;
        }
    }

    /**
     * @param {?number} date
     * @param {Date} defaultDate
     * @protected
     * @returns {Date}
     */
    getDateOrDefault(date, defaultDate) {
        if (date !== null) {
            return new Date(date);
        }
        return defaultDate;
    }

    /**
     * @inheritDoc
     */
    async generateCentralDirectoryFileHeader() {
        let header = this.getBaseCentralDirectoryFileHeader();
        header.bitFlag = this.getBitFlag(this.sourceEntry.centralDirectoryFileHeader.bitFlag);
        header.compressionMethod = this.sourceEntry.centralDirectoryFileHeader.compressionMethod;
        header.crc32 = this.sourceEntry.getCrc();
        header.compressedSize = this.isZip64() ? Constants.MAX_UINT32 : Number(this.sourceEntry.getCompressedSize());
        header.uncompressedSize = this.isZip64() ? Constants.MAX_UINT32 : Number(this.sourceEntry.getUncompressedSize());
        header.internalFileAttributes = this.sourceEntry.centralDirectoryFileHeader.internalFileAttributes;
        header.externalFileAttributes = this.sourceEntry.centralDirectoryFileHeader.externalFileAttributes;

        this.setExtraFields(header, true);

        return header;
    }

    /**
     * @param {FileHeader} header
     * @param {boolean} centralDir
     * @protected
     */
    setExtraFields(header, centralDir = false) {
        let extraFields = centralDir ?
            this.sourceEntry.centralDirectoryFileHeader.getExtraFields() :
            this.sourceEntry.localFileHeader.getExtraFields();
        for (let [type, field] of extraFields) {
            if (!(field instanceof GenericExtraField)) {
                header.setExtraField(type, field);
            }
        }
        this.setCommonExtraFields(header, this.sourceEntry.getUncompressedSize(),
            this.sourceEntry.getCompressedSize(), centralDir);
    }

    /**
     * @inheritDoc
     */
    async generateDataChunk(length) {
        if (this.sourceEntry.isDirectory()) {
            return new Uint8Array(0);
        }
        if (!this.entryDataReader) {
            this.entryDataReader = await this.sourceEntry.getRawDataReader();
        }
        return await this.entryDataReader.read(Math.min(length, this.entryDataReader.byteLength - this.entryDataReader.offset));
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
    hasDataDescriptor() {
        return false;
    }

    /**
     * @inheritDoc
     */
    async generateLocalFileHeader() {
        await this.sourceEntry.readLocalFileHeader();

        this.zip64 = this.sourceEntry.zip64ExtendedInformation ||
            this.getLocalHeaderOffset() > Constants.MAX_UINT32;

        let header = this.getBaseLocalFileHeader();
        header.bitFlag = this.getBitFlag(this.sourceEntry.localFileHeader.bitFlag);
        header.compressionMethod = this.sourceEntry.centralDirectoryFileHeader.compressionMethod;
        header.crc32 = this.sourceEntry.getCrc();
        header.compressedSize = this.isZip64() ?
            Constants.MAX_UINT32 : Number(this.sourceEntry.getCompressedSize());
        header.uncompressedSize = this.isZip64() ?
            Constants.MAX_UINT32 : Number(this.sourceEntry.getUncompressedSize());

        this.setExtraFields(header, false);

        return header;
    }

    /**
     * @inheritDoc
     */
    getDataEOF() {
        return this.sourceEntry.isDirectory() ||
            (this.entryDataReader && this.entryDataReader.offset >= this.entryDataReader.byteLength);
    }

    /**
     * @inheritDoc
     */
    isZip64() {
        return super.isZip64() || this.zip64;
    }
}

