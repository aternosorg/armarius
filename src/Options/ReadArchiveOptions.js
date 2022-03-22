import Options from "./Options.js";

/**
 * @typedef {Object} ReadArchiveOptionsObject
 * @property {number} [centralDirectoryBufferSize]
 * @property {boolean} [createEntryIndex]
 * @property {EntryOptions|EntryOptionsObject} [entryOptions]
 */


export default class ReadArchiveOptions extends Options{
    /** @type {number} */ centralDirectoryBufferSize = 1024 * 512;
    /** @type {boolean} */ createEntryIndex = true;
    /** @type {EntryOptions|EntryOptionsObject} */ entryOptions = {};
}

