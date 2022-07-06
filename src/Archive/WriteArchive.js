import EndOfCentralDirectoryRecord64 from "./Structure/EndOfCentralDirectoryRecord64.js";
import Constants from "../Constants.js";
import EndOfCentralDirectoryLocator64 from "./Structure/EndOfCentralDirectoryLocator64.js";
import EndOfCentralDirectoryRecord from "./Structure/EndOfCentralDirectoryRecord.js";
import WriteArchiveOptions from "../Options/WriteArchiveOptions.js";
import BigInt from "../Util/BigInt.js";

export default class WriteArchive {
    /** @type {WriteArchiveOptions} */ options;
    /** @type {EntrySource} */ currentEntrySource;
    /** @type {boolean} */ endOfArchive = false;
    /** @type {boolean} */ localHeaderWritten;
    /** @type {boolean} */ centralHeadersWritten = false;
    /** @type {boolean} */ endWritten = false;
    /** @type {Function} */ nextEntryFunction;
    /** @type {?number} */ centralDirOffset = null;
    /** @type {Uint8Array[]} */ centralDirHeaders = [];
    /** @type {number} */ centralDirEntryCount = 0;
    /** @type {number} */ centralDirSize = 0;
    /** @type {number} */ madeByVersion = Constants.MIN_VERSION_DEFLATE;
    /** @type {number} */ extractionVersion = Constants.MIN_VERSION_DEFLATE;
    /** @type {boolean} */ zip64 = false;
    /** @type {number} */ bytesWritten = 0;

    /**
     * @param {Function} nextEntryFunction
     * @param {WriteArchiveOptions|WriteArchiveOptionsObject} options
     */
    constructor(nextEntryFunction, options = {}) {
        this.nextEntryFunction = nextEntryFunction;
        this.options = WriteArchiveOptions.from(options);

        this.zip64 = this.options.forceZIP64;
    }

    /**
     * @param {Function} fn
     * @returns {WriteArchive}
     */
    setNextEntryFunction(fn) {
        this.nextEntryFunction = fn;
        return this;
    }

    /**
     * @returns {Function}
     */
    getNextEntryFunction() {
        return this.nextEntryFunction;
    }

    /**
     * @protected
     * @returns {Promise<void>}
     */
    async nextEntry() {
        this.currentEntrySource = await this.nextEntryFunction();
        if (!this.currentEntrySource) {
            this.endOfArchive = true;
        }
        this.localHeaderWritten = false;
    }

    /**
     * @param {number} readSize
     * @returns {Promise<?Uint8Array>}
     */
    async getNextChunk(readSize = Constants.DEFAULT_CHUNK_SIZE) {
        let chunk = await this.generateChunk(readSize);
        if (chunk) {
            this.bytesWritten += chunk.byteLength;
        }
        return chunk;
    }

    /**
     * @param {number} readSize
     * @protected
     * @returns {Promise<?Uint8Array>}
     */
    async generateChunk(readSize = Constants.DEFAULT_CHUNK_SIZE) {
        if (!this.currentEntrySource && !this.endOfArchive) {
            await this.nextEntry();
        }
        if (this.endOfArchive) {
            return await this.getEndOfArchiveChunk(readSize);
        }
        if (!this.localHeaderWritten) {
            this.currentEntrySource.setLocalHeaderOffset(this.bytesWritten);
            let header = await this.currentEntrySource.generateLocalFileHeader();

            if (this.currentEntrySource.isZip64()) {
                this.zip64 = true;
            }
            this.madeByVersion = Math.max(this.madeByVersion, this.currentEntrySource.madeByVersion);
            this.madeByVersion = Math.max(this.extractionVersion, this.currentEntrySource.extractionVersion);

            this.localHeaderWritten = true;
            return await header.serialize();
        }
        return await this.getEntryDataChunk(readSize);
    }

    /**
     * @param {number} readSize
     * @protected
     * @returns {Promise<Uint8Array>}
     */
    async getEntryDataChunk(readSize) {
        let chunk = await this.currentEntrySource.generateDataChunk(readSize);
        if (this.currentEntrySource.getDataEOF()) {
            let descriptor = await this.currentEntrySource.generateDataDescriptor();
            if (descriptor) {
                let dataChunk = chunk;
                let descriptorChunk = await descriptor.serialize();
                chunk = new Uint8Array(dataChunk.byteLength + descriptorChunk.byteLength);
                chunk.set(dataChunk, 0);
                chunk.set(descriptorChunk, dataChunk.byteLength);
            }
            let centralHeader = await (await this.currentEntrySource.generateCentralDirectoryFileHeader()).serialize();
            this.centralDirSize += centralHeader.byteLength;
            this.centralDirEntryCount++;
            this.centralDirHeaders.push(centralHeader);
            this.currentEntrySource = null;
        }
        return chunk;
    }

    /**
     * @param {number} readSize
     * @protected
     * @returns {Uint8Array}
     */
    getCentralDirectoryChunk(readSize = Constants.DEFAULT_CHUNK_SIZE) {
        if(this.centralDirOffset === null) {
            this.centralDirOffset = this.bytesWritten;
        }

        if(!this.centralDirHeaders.length) {
            this.centralHeadersWritten = true;
            return new Uint8Array(0);
        }

        let res = new Uint8Array(Math.max(
            Math.min(this.centralDirSize, readSize),
            this.centralDirHeaders[0].byteLength));

        let offset = 0;
        while (this.centralDirHeaders[0] && offset + this.centralDirHeaders[0].byteLength <= res.byteLength) {
            let header = this.centralDirHeaders.shift();
            res.set(header, offset);
            offset += header.byteLength;
        }

        if(!this.centralDirHeaders.length) {
            this.centralHeadersWritten = true;
        }

        return new Uint8Array(res.buffer, res.byteOffset, offset);
    }

    /**
     * @param {number} readSize
     * @protected
     * @returns {Promise<?Uint8Array>}
     */
    async getEndOfArchiveChunk(readSize = Constants.DEFAULT_CHUNK_SIZE) {
        if (!this.centralHeadersWritten) {
            return this.getCentralDirectoryChunk(readSize);
        }

        if (!this.endWritten) {
            if (this.centralDirEntryCount > Constants.MAX_UINT16 ||
                this.centralDirSize > Constants.MAX_UINT32 ||
                this.centralDirOffset > Constants.MAX_UINT32) {
                this.zip64 = true;
            }
            let endStructures = [];
            if (this.zip64) {
                endStructures.push(await this.getZip64EndRecord().serialize());
                endStructures.push(await this.getZip64EndLocator(this.bytesWritten).serialize());
            }
            endStructures.push(await this.getEndRecord().serialize());

            let length = endStructures.reduce((length, element) => length + element.byteLength, 0);
            let res = new Uint8Array(length);
            let offset = 0;
            for (let structure of endStructures) {
                res.set(structure, offset);
                offset += structure.byteLength;
            }
            this.endWritten = true;
            return res;
        }

        return null;
    }

    /**
     * @protected
     * @returns {EndOfCentralDirectoryRecord}
     */
    getEndRecord() {
        let record = new EndOfCentralDirectoryRecord();
        record.diskNumber = 0;
        record.centralDirectoryDiskNumber = 0;
        record.diskCentralDirectoryEntries = this.zip64 ? Constants.MAX_UINT32 : this.centralDirEntryCount;
        record.centralDirectoryEntries = this.zip64 ? Constants.MAX_UINT32 : this.centralDirEntryCount;
        record.centralDirectorySize = this.zip64 ? Constants.MAX_UINT32 : this.centralDirSize;
        record.centralDirectoryOffset = this.zip64 ? Constants.MAX_UINT32 : this.centralDirOffset;
        record.fileComment = new Uint8Array(0);
        return record;
    }

    /**
     * @protected
     * @returns {EndOfCentralDirectoryRecord64}
     */
    getZip64EndRecord() {
        let record = new EndOfCentralDirectoryRecord64();
        record.madeByVersion = this.madeByVersion;
        record.extractionVersion = this.extractionVersion;
        record.diskNumber = 0;
        record.centralDirectoryDiskNumber = 0;
        record.diskCentralDirectoryEntries = BigInt(this.centralDirEntryCount);
        record.centralDirectoryEntries = BigInt(this.centralDirEntryCount);
        record.centralDirectorySize = BigInt(this.centralDirSize);
        record.centralDirectoryOffset = BigInt(this.centralDirOffset);
        record.extensibleDataSector = new Uint8Array(0);
        return record;
    }

    /**
     * @param {number} offset
     * @protected
     * @returns {EndOfCentralDirectoryLocator64}
     */
    getZip64EndLocator(offset) {
        let locator = new EndOfCentralDirectoryLocator64();
        locator.centralDirectoryEndDiskNumber = 0;
        locator.centralDirectoryEndOffset = BigInt(offset);
        locator.disks = 1;
        return locator;
    }

    /**
     * Get the offset of the start of the central directory
     * Returns null if the first central directory chunk has not been generated yet
     * @return {?number}
     */
    getCentralDirectoryOffset() {
        return this.centralDirOffset;
    }

    /**
     * Get the length of the central directory in bytes
     * Returns null if the first central directory chunk has not been generated yet
     * @return {null|number}
     */
    getCentralDirectoryByteLength() {
        if(this.centralDirOffset === null) {
            return null;
        }
        return this.centralDirSize;
    }

    /**
     * Get the number of entries in the central directory
     * Returns null if the first central directory chunk has not been generated yet
     * @return {null|number}
     */
    getCentralDirectoryEntryCount() {
        if(this.centralDirOffset === null) {
            return null;
        }
        return this.centralDirEntryCount;
    }
}
