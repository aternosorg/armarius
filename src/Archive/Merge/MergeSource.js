export default class MergeSource {
    /** @type {ReadArchive} */ archive;
    /** @type {string} */ basePath = '';
    /** @type {string} */ destinationPath = '';
    /** @type {?Function} */ filter = null;

    constructor(archive) {
        this.archive = archive;
    }

    /**
     * @param {string} path
     * @return {MergeSource}
     */
    setBasePath(path) {
        this.basePath = this.normalizeDirPath(path);
        return this;
    }

    /**
     * @param {string} path
     * @return {MergeSource}
     */
    setDestinationPath(path) {
        this.destinationPath = this.normalizeDirPath(path);
        return this;
    }

    /**
     * @param {Function} fn
     * @return {MergeSource}
     */
    setFilter(fn) {
        this.filter = fn;
        return this;
    }

    /**
     * @param {ArchiveEntry} entry
     * @return {Promise<boolean>}
     */
    async isEntryIncluded(entry) {
        if(!this.filter) {
            return true;
        }
        return !!await this.filter(entry);
    }

    /**
     * @param {string} path
     * @protected
     * @returns {string}
     */
    normalizeDirPath(path) {
        if(!path.length) {
            return path;
        }
        if(path.startsWith('/')) {
            path = path.substring(1);
        }
        if(!path.endsWith('/')) {
            path += '/';
        }
        return path;
    }
}

