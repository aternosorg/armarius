import Constants from "../Constants.js";
import EndOfCentralDirectoryRecord from "./Structure/EndOfCentralDirectoryRecord.js";
import EndOfCentralDirectoryLocator64 from "./Structure/EndOfCentralDirectoryLocator64.js";
import EndOfCentralDirectoryRecord64 from "./Structure/EndOfCentralDirectoryRecord64.js";
import ArchiveEntry from "./Entry/ArchiveEntry.js";
import ArchiveIndex from "../Index/ArchiveIndex.js";
import EntryReference from "./Entry/EntryReference.js";
import EntryIterator from "./Entry/EntryIterator.js";
import ReadArchiveOptions from "../Options/ReadArchiveOptions.js";
import {BigInt} from 'armarius-io';
import ZipError from '../Error/ZipError.js';
import FeatureError from '../Error/FeatureError.js';

export default class ReadArchive {
    /** @type {import("armarius-io").IO} */ io;
    /** @type {ReadArchiveOptions} */ options;
    /** @type {ArchiveIndex} */ centralDirectoryIndex;
    /** @type {number} */ endOfCentralDirectoryOffset;
    /** @type {number} */ endOfCentralDirectoryOffset64;
    /** @type {number} */ centralDirectoryOffset;
    /** @type {number} */ centralDirectoryByteLength;
    /** @type {number} */ centralDirectoryEntryCount;
    /** @type {boolean} */ isZip64 = false;
    /** @type {import("armarius-io").IO} */ centralDirectoryIO;
    /** @type {number} */ prependedDataLength = 0;
    /** @type {EndOfCentralDirectoryRecord} */ endOfCentralDirectoryRecord;
    /** @type {EndOfCentralDirectoryRecord64} */ endOfCentralDirectoryRecord64;
    /** @type {EndOfCentralDirectoryLocator64} */ endOfCentralDirectoryLocator64;

    /**
     * @param {import("armarius-io").IO} io
     * @param {ReadArchiveOptions|ReadArchiveOptionsObject} options
     */
    constructor(io, options = {}) {
        this.io = io;
        this.options = ReadArchiveOptions.from(options);
    }

    /**
     * Initialize ZIP reader, read end of central directory record, locate central directory
     * @returns {Promise<void>}
     */
    async init() {
        if (this.io.byteLength < Constants.LENGTH_END_OF_CENTRAL_DIR) {
            throw new ZipError('Total file length is shorter than end of central directory record');
        }

        this.endOfCentralDirectoryOffset = await this.findEndOfCentralDirectoryRecord();

        this.endOfCentralDirectoryRecord = await EndOfCentralDirectoryRecord.fromIO(await this.io.clone(this.endOfCentralDirectoryOffset));
        this.centralDirectoryByteLength = this.endOfCentralDirectoryRecord.centralDirectorySize;
        this.centralDirectoryOffset = this.endOfCentralDirectoryRecord.centralDirectoryOffset;
        this.centralDirectoryEntryCount = this.endOfCentralDirectoryRecord.centralDirectoryEntries;
        this.isZip64 = false;
        this.prependedDataLength = 0;

        if(this.endOfCentralDirectoryRecord.diskNumber !== 0 || this.endOfCentralDirectoryRecord.centralDirectoryDiskNumber !== 0) {
            if (!this.options.ignoreMultiDiskErrors) {
                throw new FeatureError('Multi disk archives are not supported');
            }
        }

        /*
        centralDirectoryOffset, centralDirectorySize, or centralDirectoryEntries being at their max. value
        indicates a ZIP64 archive
         */
        if (this.centralDirectoryOffset === Constants.MAX_UINT32 ||
            this.centralDirectoryByteLength === Constants.MAX_UINT32 ||
            this.centralDirectoryEntryCount === Constants.MAX_UINT16) {

            this.isZip64 = true;
            await this.readZip64Structures();
        }

        if (this.centralDirectoryOffset < 0 || this.centralDirectoryOffset >= this.io.byteLength) {
            throw new ZipError('Invalid central directory data offset');
        }

        let offset = 0;
        this.centralDirectoryIO = await this.io.clone(this.centralDirectoryOffset, this.centralDirectoryByteLength);

        /*
        If there are entries in the central directory, we can check whether we are at the correct location by looking
        at the signature of the first entry.
         */
        if (this.centralDirectoryEntryCount > 0) {
            let possibleCentralDirectoryOffset;
            if(this.isZip64) {
                possibleCentralDirectoryOffset = this.endOfCentralDirectoryOffset64 - this.centralDirectoryByteLength;
            }else {
                possibleCentralDirectoryOffset = this.endOfCentralDirectoryOffset - this.centralDirectoryByteLength;
            }

            if (await this.centralDirectoryIO.getUint32At(offset) !== Constants.SIGNATURE_CENTRAL_DIR_FILE_HEADER &&
                this.centralDirectoryOffset !== possibleCentralDirectoryOffset) {
                const oldCentralDirectoryOffset = this.centralDirectoryOffset;
                this.centralDirectoryOffset = possibleCentralDirectoryOffset;
                this.prependedDataLength = this.centralDirectoryOffset - oldCentralDirectoryOffset;
                this.centralDirectoryIO = await this.io.clone(this.centralDirectoryOffset, this.centralDirectoryByteLength);
            }
        }
        if (this.centralDirectoryOffset < 0 || this.centralDirectoryOffset >= this.io.byteLength) {
            throw new ZipError('Invalid central directory data offset');
        }
    }

    /**
     * Try to find the End of central directory record by its signature
     * @protected
     * @returns {Promise<number>}
     */
    async findEndOfCentralDirectoryRecord() {
        let endOfDirectoryOffset = this.io.byteLength - Constants.LENGTH_END_OF_CENTRAL_DIR;
        if(await this.io.getUint32At(endOfDirectoryOffset) !== Constants.SIGNATURE_END_OF_CENTRAL_DIR) {
            endOfDirectoryOffset = await this.io.lastIndexOf(
                Constants.SIGNATURE_END_OF_CENTRAL_DIR,
                this.io.byteLength - Constants.MAX_UINT16 - Constants.LENGTH_END_OF_CENTRAL_DIR,
                this.io.byteLength - Constants.LENGTH_END_OF_CENTRAL_DIR
            );
            if (endOfDirectoryOffset === -1) {
                throw new ZipError('Unable to find end of central directory record');
            }
        }
        return endOfDirectoryOffset;
    }

    /**
     * Read the Zip64 end of central directory locator and Zip64 end of central directory record
     * @protected
     * @returns {Promise<void>}
     */
    async readZip64Structures() {
        const endOfDirectoryLocatorReader = await this.io.clone(
            this.endOfCentralDirectoryOffset - Constants.LENGTH_END_OF_CENTRAL_DIR_LOCATOR_ZIP64,
            Constants.LENGTH_END_OF_CENTRAL_DIR_LOCATOR_ZIP64
        );
        this.endOfCentralDirectoryLocator64 = await EndOfCentralDirectoryLocator64.fromIO(endOfDirectoryLocatorReader);

        if(this.endOfCentralDirectoryLocator64.disks > 1 && !this.options.ignoreMultiDiskErrors) {
            throw new FeatureError('Multi disk archives are not supported');
        }

        this.endOfCentralDirectoryOffset64 = Number(this.endOfCentralDirectoryLocator64.centralDirectoryEndOffset);
        let endOfDirectoryReader = await this.io.clone(this.endOfCentralDirectoryOffset64, Constants.LENGTH_END_OF_CENTRAL_DIR_ZIP64);

        /*
         Sometimes, archive data can be prepended by some other data, which means that
         none of the offsets are actually correct. In that case, the best option is to guess.

         Unfortunately, the zip64 end of central directory record can include a variable sized "extensible data sector"
         so this will only work if that sector is empty.
         */
        const possibleEndOfDirectoryOffset = this.endOfCentralDirectoryOffset -
            Constants.LENGTH_END_OF_CENTRAL_DIR_LOCATOR_ZIP64 -
            Constants.LENGTH_END_OF_CENTRAL_DIR_ZIP64;

        /*
        If the offset we got from the locator is, in fact, wrong, we use our guess instead.
         */
        if (await endOfDirectoryReader.getUint32At(0) !== Constants.SIGNATURE_END_OF_CENTRAL_DIR_ZIP64 &&
            this.endOfCentralDirectoryOffset64 !== possibleEndOfDirectoryOffset) {
            const oldEndOfCentralDirOffset = this.endOfCentralDirectoryOffset64;
            this.endOfCentralDirectoryOffset64 = possibleEndOfDirectoryOffset;
            this.prependedDataLength = this.endOfCentralDirectoryOffset64 - oldEndOfCentralDirOffset;
            endOfDirectoryReader = await this.io.clone(this.endOfCentralDirectoryOffset64);
        }

        this.endOfCentralDirectoryRecord64 = await EndOfCentralDirectoryRecord64.fromIO(endOfDirectoryReader);

        if(this.endOfCentralDirectoryRecord64.diskNumber !== 0 ||
            this.endOfCentralDirectoryRecord64.centralDirectoryDiskNumber !== 0) {

            if (!this.options.ignoreMultiDiskErrors) {
                throw new FeatureError('Multi disk archives are not supported');
            }
        }

        this.centralDirectoryByteLength = Number(this.endOfCentralDirectoryRecord64.centralDirectorySize);
        this.centralDirectoryOffset = Number(this.endOfCentralDirectoryRecord64.centralDirectoryOffset) + this.prependedDataLength;
        this.centralDirectoryEntryCount = Number(this.endOfCentralDirectoryRecord64.centralDirectoryEntries);
    }

    /**
     * @returns {Promise<EntryIterator>}
     */
    async getEntryIterator() {
        return new EntryIterator(
            this,
            (await this.centralDirectoryIO.clone()).setMaxBufferSize(this.options.centralDirectoryBufferSize),
            this.options.createEntryIndex
        );
    }

    /**
     * @returns {Promise<ArchiveEntry[]>}
     */
    async getAllEntries() {
        let entries = [];
        await this.forEachEntry(entry => entries.push(entry));
        return entries;
    }

    /**
     * @param {Function} callback
     * @returns {Promise<void>}
     */
    async forEachEntry(callback) {
        let iterator = await this.getEntryIterator();
        let entry, i = 0;
        while ((entry = await iterator.next()) !== null) {
            await callback(entry, i);
        }
    }

    /**
     * @param {string} filename
     * @returns {Promise<?ArchiveEntry>}
     */
    async findEntry(filename) {
        if (this.centralDirectoryIndex) {
            let offsets = this.centralDirectoryIndex.getPossibleOffsets(filename);
            if (!offsets.length) {
                return null;
            }
            for (let offset of offsets) {
                let entry = await this.readEntryAt(offset);
                if (entry.getFileNameString() === filename) {
                    return entry;
                }
            }
            return null;
        }

        let result = null;
        await this.forEachEntry(entry => {
            if (entry.getFileNameString() === filename) {
                result = entry;
            }
        });
        return result;
    }

    /**
     * @param {number} crc
     * @returns {Promise<EntryReference[]>}
     */
    async findEntriesByHash(crc) {
        if (this.centralDirectoryIndex) {
            let offsets = this.centralDirectoryIndex.getPossibleOffsetsByHash(crc);
            return offsets.map(offset => new EntryReference(this, offset, crc));
        }

        let result = [];
        await this.forEachEntry(entry => {
            if (ArchiveIndex.getFilenameCrc(entry.getFileNameString()) === crc) {
                result.push(entry.getReference());
            }
        });
        return result;
    }

    /**
     * @param {number} offset
     * @param {?import("armarius-io").IO} io
     * @returns {Promise<ArchiveEntry>}
     */
    async readEntryAt(offset, io = null) {
        if (!io) {
            io = await this.centralDirectoryIO.clone();
        }
        let entry = new ArchiveEntry(this);
        await entry.readCentralDirectoryHeader(io.seek(offset), offset);
        return entry;
    }

    /**
     * Checks whether the archive possibly has an entry with a given filename.
     *
     * If this function returns false, the archive does not include a file with the given name.
     * If this function returns true, this archive may or may not include a file with the given name.
     * @param filename
     * @returns {boolean}
     */
    mayHaveEntry(filename) {
        if (!this.centralDirectoryIndex) {
            return true;
        }
        let offsets = this.centralDirectoryIndex.getPossibleOffsets(filename);
        return !!offsets.length;
    }

    /**
     * @param {number} offset
     * @param {?number} byteLength
     * @returns {Promise<import("armarius-io").IO>}
     */
    async getReader(offset = 0, byteLength = null) {
        return await this.io.clone(offset, byteLength);
    }

    /**
     * Number of this disk
     * @returns {number}
     */
    getDiskNumber() {
        return this.endOfCentralDirectoryRecord64?.diskNumber ?? this.endOfCentralDirectoryRecord.diskNumber;
    }

    /**
     * Number of the disk with the start of the central directory
     * @returns {number}
     */
    getCentralDirectoryDiskNumber() {
        return this.endOfCentralDirectoryRecord64?.centralDirectoryDiskNumber ??
            this.endOfCentralDirectoryRecord.centralDirectoryDiskNumber;
    }

    /**
     * Total number of entries in the central directory on this disk
     * @returns {BigInt}
     */
    getDiskCentralDirectoryEntryCount() {
        return BigInt(this.endOfCentralDirectoryRecord64?.diskCentralDirectoryEntries ??
            this.endOfCentralDirectoryRecord.diskCentralDirectoryEntries);
    }

    /**
     * Total number of entries in the central directory
     * @returns {BigInt}
     */
    getCentralDirectoryEntryCount() {
        return BigInt(this.endOfCentralDirectoryRecord64?.centralDirectoryEntries ??
            this.endOfCentralDirectoryRecord.centralDirectoryEntries);
    }

    /**
     * Size of the central directory
     * @returns {BigInt}
     */
    getCentralDirectorySize() {
        return BigInt(this.endOfCentralDirectoryRecord64?.centralDirectorySize ??
            this.endOfCentralDirectoryRecord.centralDirectorySize);
    }

    /**
     * Offset of start of central directory with respect to the starting disk number
     * @returns {BigInt}
     */
    getCentralDirectoryOffset() {
        return BigInt(this.endOfCentralDirectoryRecord64?.centralDirectoryOffset ??
            this.endOfCentralDirectoryRecord.centralDirectoryOffset);
    }

    /**
     * ZIP file comment
     * @returns {Uint8Array}
     */
    getFileComment() {
        return this.endOfCentralDirectoryRecord.fileComment;
    }

    /**
     * Version made by
     * @returns {?number}
     */
    getMadeByVersion() {
        return this.endOfCentralDirectoryRecord64?.madeByVersion ?? null;
    }

    /**
     * Version needed to extract
     * @returns {?number}
     */
    getExtractionVersion() {
        return this.endOfCentralDirectoryRecord64?.extractionVersion ?? null;
    }

    /**
     * ZIP file comment
     * @returns {?Uint8Array}
     */
    getExtensibleDataSector() {
        return this.endOfCentralDirectoryRecord64?.extensibleDataSector ?? null;
    }
}

