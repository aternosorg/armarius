import ArchiveIndex from "../../Index/ArchiveIndex.js";
import ArchiveEntry from "./ArchiveEntry.js";
import BigInt from "../../Util/BigInt.js";

export default class EntryIterator {
    /** @type {ReadArchive} */ archive;
    /** @type {bigint} */ entryCount;
    /** @type {number} */ startOffset;
    /** @type {bigint} */ currentEntry;
    /** @type {DataReader} */ reader;
    /** @type {ArchiveIndex} */ archiveIndex;
    /** @type {boolean} */ createIndex = true;

    /**
     * @param {ReadArchive} archive
     * @param {DataReader} reader
     * @param {boolean} createIndex
     */
    constructor(archive, reader, createIndex = true) {
        this.archive = archive;
        this.reader = reader;
        this.createIndex = createIndex;
        this.startOffset = reader.offset;
        this.entryCount = archive.getCentralDirectoryEntryCount();
        this.reset();
    }

    reset() {
        if(this.createIndex) {
            this.archiveIndex = new ArchiveIndex();
        }
        this.reader.seek(this.startOffset);
        this.currentEntry = BigInt(0);
    }

    /**
     * @returns {Promise<?ArchiveEntry>}
     */
    async next() {
        if (this.currentEntry >= this.entryCount) {
            return null;
        }
        let offset = this.reader.offset;
        let entry = await ArchiveEntry.load(this.archive, this.reader, offset);
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

