import WriteArchive from "../WriteArchive.js";
import ArchiveEntryEntrySource from "../EntrySource/ArchiveEntryEntrySource.js";
import MergeOptions from "../../Options/MergeOptions.js";
import MergeSource from "./MergeSource.js";
import DirectoryEntrySource from "../EntrySource/DirectoryEntrySource.js";

export default class ArchiveMerger {
    /** @type {MergeSource[]} */ archives;
    /** @type {number} */ currentArchive = -1;
    /** @type {EntryIterator} */ currentIterator;
    /** @type {WriteArchive} */ outputArchive;
    /** @type {Set<string>} */ addedEntries = new Set();
    /** @type {MergeOptions} */ options;
    /** @type {DirectoryEntrySource[]} */ destinationPathFolders = [];

    /**
     * @param {Array<ReadArchive, MergeSource>} archives
     * @param {MergeOptions|MergeOptionsObject} options
     */
    constructor(archives, options = {}) {
        this.archives = archives.map(archive => archive instanceof MergeSource ? archive : new MergeSource(archive));
        this.options = MergeOptions.from(options);
        this.outputArchive = new WriteArchive(this.nextEntry.bind(this), this.options.writeArchiveOptions);
        this.addDestinationPaths();
    }

    /**
     * @protected
     */
    addDestinationPaths() {
        for(let source of this.archives) {
            let path = '';
            for (let part of source.destinationPath.split('/')) {
                if(!part.length) {
                    continue;
                }
                path += part + '/';
                if(!this.addedEntries.has(path)) {
                    this.addedEntries.add(path);
                    this.destinationPathFolders.push(new DirectoryEntrySource({fileName: path}));
                }
            }
        }
    }

    /**
     * @protected
     * @returns {Promise<?EntrySource>}
     */
    async nextEntry() {
        if(this.destinationPathFolders.length) {
            return this.destinationPathFolders.shift();
        }

        let injectedEntry = await this.options.nextPrependingEntryFunction();
        if(injectedEntry && injectedEntry.getFileNameString()) {
            this.addedEntries.add(injectedEntry.getFileNameString());
            return injectedEntry;
        }

        if(!this.currentIterator) {
            if(!await this.nextArchive()) {
                return null;
            }
        }

        let source = this.archives[this.currentArchive];
        let entry, fileName, newFileName;
        do {
            entry = await this.currentIterator.next();
            if(!entry) {
                break;
            }

            fileName = entry.getFileNameString();
            newFileName = source.destinationPath + fileName.substring(source.basePath.length);
        }while (!fileName.startsWith(source.basePath) || this.entryAlreadyExists(newFileName) || !await source.isEntryIncluded(entry));

        if(!entry) {
            this.currentIterator = null;
            return await this.nextEntry();
        }

        this.addedEntries.add(newFileName);
        return new ArchiveEntryEntrySource(entry, Object.assign(this.options.entrySourceOptions, {fileName: newFileName}));
    }

    /**
     * @protected
     * @returns {Promise<?ReadArchive>}
     */
    async nextArchive() {
        this.currentArchive++;
        let mergeSource = this.archives[this.currentArchive];

        if(mergeSource) {
            this.currentIterator = await mergeSource.archive.getEntryIterator();
            return mergeSource.archive;
        }else {
            this.currentIterator = null;
            return null;
        }
    }

    /**
     * @param {string} name
     * @protected
     * @returns {boolean}
     */
    entryAlreadyExists(name) {
        if(!name.endsWith('/')) {
            name += '/';
        }
        if(this.addedEntries.has(name)) {
            return true;
        }
        let index = Infinity;
        while ((index = name.lastIndexOf('/', index - 1)) > 0) {
            if(this.addedEntries.has(name.substring(0, index))) {
                return true;
            }
        }
        return false;
    }

    /**
     * @returns {WriteArchive}
     */
    getOutputArchive() {
        return this.outputArchive;
    }
}

