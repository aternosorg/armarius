import ArchiveIndex from "../../Index/ArchiveIndex.js";
import ArchiveEntry from "./ArchiveEntry.js";
import {BigInt} from 'armarius-io';

export default class EntryIterator {
    /** @type {ReadArchive} */ archive;
    /** @type {BigInt} */ entryCount;
    /** @type {number} */ startOffset;
    /** @type {BigInt} */ currentEntry;
    /** @type {import("armarius-io").IO} */ io;
    /** @type {ArchiveIndex} */ archiveIndex;
    /** @type {boolean} */ createIndex = true;

    /**
     * @param {ReadArchive} archive
     * @param {import("armarius-io").IO} io
     * @param {boolean} createIndex
     */
    constructor(archive, io, createIndex = true) {
        this.archive = archive;
        this.io = io;
        this.createIndex = createIndex;
        this.startOffset = io.offset;
        this.entryCount = archive.getCentralDirectoryEntryCount();
        this.reset();
    }

    reset() {
        if(this.createIndex) {
            this.archiveIndex = new ArchiveIndex();
        }
        this.io.seek(this.startOffset);
        this.currentEntry = BigInt(0);
    }

    /**
     * @return {Promise<EntryIterator>}
     */
    async clone() {
        let cloneReader = await this.io.clone();
        cloneReader.seek(this.io.offset);

        let cloneIterator = new this.constructor(this.archive, cloneReader, false);
        cloneIterator.currentEntry = this.currentEntry;
        cloneIterator.startOffset = this.startOffset;
        return cloneIterator;
    }

    /**
     * @returns {Promise<?ArchiveEntry>}
     */
    async next() {
        if (this.currentEntry >= this.entryCount) {
            return null;
        }
        let offset = this.io.offset;
        let entry = await ArchiveEntry.load(this.archive, this.io, offset);
        this.currentEntry++;
        if(this.createIndex) {
            this.archiveIndex.add(entry.getFileNameString(), offset);
            if (this.currentEntry >= this.entryCount) {
                this.archiveIndex.finalize();
                this.archive.centralDirectoryIndex = this.archiveIndex;
            }
        }
        return entry;
    }
}

