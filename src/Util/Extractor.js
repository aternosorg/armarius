import {symbols, Path} from "armarius-io";
import {DEFAULT_CHUNK_SIZE} from "armarius-io/src/Constants.js";
import AsyncSafeEntryIterator from "../Archive/Entry/AsyncSafeEntryIterator.js";

export default class Extractor {
    /** @type {number} */ maxConcurrentEntries;
    /** @type {?function(entry: ArchiveEntry, filename: string): Promise<boolean>} */ filter;

    /**
     * @param {?function(entry: ArchiveEntry, filename: string): Promise<boolean>} filter
     * @param {number} maxConcurrentEntries
     */
    constructor(filter = null, maxConcurrentEntries = 10) {
        this.maxConcurrentEntries = maxConcurrentEntries;
        this.filter = filter;
    }

    /**
     * @param {AsyncSafeEntryIterator} entryIterator
     * @param {import("armarius-io").FileHandleInterface} outputDirectory
     * @param {AbortSignal} signal
     * @param {string} archiveBasePath
     * @returns {Promise<void>}
     */
    async extractEntries(entryIterator, outputDirectory, signal, archiveBasePath = "") {
        let entry;
        while (entry = await entryIterator.next()) {
            signal.throwIfAborted();
            let filename = entry.getFileNameString();
            if (archiveBasePath.length && (!filename.startsWith(archiveBasePath) || filename === archiveBasePath)) {
                continue;
            }
            filename = filename.substring(archiveBasePath.length);
            if (this.filter && !await this.filter(entry, filename)) {
                continue;
            }
            if (entry.isDirectory()) {
                let child = await outputDirectory.createChildDirectory(filename);
                await child[symbols.asyncDispose]();
                continue;
            }

            let dirname = Path.dirname(filename);
            let basename = Path.basename(filename);
            let baseDir = outputDirectory;
            let dispose = false;
            if (dirname.length) {
                baseDir = await outputDirectory.createChildDirectory(dirname);
                dispose = true;
            }

            let outputFile = await baseDir.getChild(basename);
            let writer;
            try {
                writer = await outputFile.open(false, true)
            } catch (e) {
                outputFile[symbols.asyncDispose]();
                if (dispose) {
                    await baseDir[symbols.asyncDispose]();
                }
                throw e;
            }

            try {
                signal.throwIfAborted();
                let dataReader = await entry.getDataReader();
                let chunk;
                while (chunk = await dataReader.read(DEFAULT_CHUNK_SIZE)) {
                    signal.throwIfAborted();
                    await writer.write(chunk);
                }
            } finally {
                await writer[symbols.asyncDispose]();
                await outputFile[symbols.asyncDispose]();
                if (dispose) {
                    await baseDir[symbols.asyncDispose]();
                }
            }
        }
    }

    /**
     * @param {ReadArchive} archive
     * @param {import("armarius-io").FileHandleInterface} outputDirectory
     * @param {string} archiveBasePath
     * @param {?AbortSignal} userAbortSignal
     * @returns {Promise<this>}
     */
    async extract(archive, outputDirectory, archiveBasePath = "", userAbortSignal = null) {
        let abortController = new AbortController();
        let abortSignal = abortController.signal;
        if (userAbortSignal) {
            abortSignal = AbortSignal.any([userAbortSignal, abortSignal]);
        }

        abortSignal.throwIfAborted();

        let entryIterator = new AsyncSafeEntryIterator(await archive.getEntryIterator());
        let promises = [];
        for (let i = 0; i < this.maxConcurrentEntries; i++) {
            promises.push(this.extractEntries(entryIterator, outputDirectory, abortSignal, archiveBasePath));
        }
        try {
            await Promise.all(promises);
        } finally {
            abortController.abort();
            await Promise.allSettled(promises);
        }
        return this;
    }
}
