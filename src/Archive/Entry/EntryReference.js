export default class EntryReference {
    /** @type {number} */ offset;
    /** @type {ReadArchive} */ archive;
    /** @type {number} */ fileNameHash;

    /**
     * @param {ReadArchive} archive
     * @param {number} offset
     * @param {number} fileNameHash
     */
    constructor(archive, offset, fileNameHash) {
        this.offset = offset;
        this.archive = archive;
        this.fileNameHash = fileNameHash;
    }

    /**
     * @returns {Promise<ArchiveEntry>}
     */
    async resolve() {
        return await this.archive.readEntryAt(this.offset);
    }
}

