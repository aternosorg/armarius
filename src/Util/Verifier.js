import {DEFAULT_CHUNK_SIZE} from "armarius-io/src/Constants.js";
import AsyncSafeEntryIterator from "../Archive/Entry/AsyncSafeEntryIterator.js";

/**
 * @typedef {"header"|"decompressed"} VerifyMode
 */

export default class Verifier {
    /** @type {number} */ maxConcurrentEntries;
    /** @type {VerifyMode} */ mode;
    /** @type {?function(entry: ArchiveEntry): Promise<boolean>} */ filter;

    /**
     * @param {VerifyMode} mode
     * @param {?function(entry: ArchiveEntry): Promise<boolean>} filter
     * @param {number} maxConcurrentEntries
     */
    constructor(mode = "decompressed", filter = null, maxConcurrentEntries = 10) {
        this.mode = mode;
        this.maxConcurrentEntries = maxConcurrentEntries;
        this.filter = filter;
    }

    /**
     * @param {AsyncSafeEntryIterator} entryIterator
     * @param {AbortSignal} signal
     * @returns {Promise<void>}
     */
    async verifyEntries(entryIterator, signal) {
        let entry;
        while (entry = await entryIterator.next()) {
            signal.throwIfAborted();
            if (this.filter && !await this.filter(entry)) {
                continue;
            }
            if (entry.isDirectory()) {
                continue;
            }

            if (this.mode === "header") {
                continue;
            }

            let dataReader = await entry.getDataReader();
            while (await dataReader.read(DEFAULT_CHUNK_SIZE)) {
                // Discard data
            }
        }
    }

    /**
     * @param {ReadArchive} archive
     * @param {?AbortSignal} userAbortSignal
     * @returns {Promise<this>}
     */
    async verify(archive, userAbortSignal = null) {
        let abortController = new AbortController();
        let abortSignal = abortController.signal;
        if (userAbortSignal) {
            abortSignal = AbortSignal.any([userAbortSignal, abortSignal]);
        }

        abortSignal.throwIfAborted();

        let entryIterator = new AsyncSafeEntryIterator(await archive.getEntryIterator());
        let promises = [];
        for (let i = 0; i < this.maxConcurrentEntries; i++) {
            promises.push(this.verifyEntries(entryIterator, abortSignal));
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
