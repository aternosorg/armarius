import Options from "./Options.js";
import Constants from '../Constants.js';

/**
 * @typedef {Object} ReadArchiveOptionsObject
 * @property {number} [centralDirectoryBufferSize]
 * @property {boolean} [createEntryIndex]
 * @property {EntryOptions|EntryOptionsObject} [entryOptions]
 * @property {boolean} [ignoreMultiDiskErrors]
 * @property {boolean} [allowTruncatedCentralDirectory]
 * @property {boolean} [allowAdditionalCentralDirectoryEntries]
 */


export default class ReadArchiveOptions extends Options {
    /** @type {number} */ centralDirectoryBufferSize = Constants.DEFAULT_CHUNK_SIZE;
    /** @type {boolean} */ createEntryIndex = true;
    /** @type {EntryOptions|EntryOptionsObject} */ entryOptions = {};
    /** @type {boolean} */ ignoreMultiDiskErrors = false;
    /** @type {boolean} */ allowTruncatedCentralDirectory = false;
    /** @type {boolean} */ allowAdditionalCentralDirectoryEntries = false;
}

