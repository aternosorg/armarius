import Options from './Options.js';

/**
 * @typedef {Object} EntryDataReaderOptionsObject
 * @property {boolean} [ignoreInvalidChecksums]
 * @property {boolean} [ignoreInvalidUncompressedSize]
 */

export default class EntryDataReaderOptions extends Options {
    /** @type {boolean} */ ignoreInvalidChecksums = false;
    /** @type {boolean} */ ignoreInvalidUncompressedSize = false;
}

