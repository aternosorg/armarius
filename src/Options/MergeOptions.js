import Options from "./Options.js";

/**
 * @typedef {Object} MergeOptionsObject
 * @property {EntrySourceOptions|EntrySourceOptionsObject} [entrySourceOptions]
 * @property {WriteArchiveOptions|WriteArchiveOptionsObject} [writeArchiveOptions]
 * @property {Function} [nextPrependingEntryFunction]
 */


export default class MergeOptions extends Options {
    /** @type {EntrySourceOptions|EntrySourceOptionsObject} */ entrySourceOptions = {};
    /** @type {WriteArchiveOptions|WriteArchiveOptionsObject} */ writeArchiveOptions = {};
    /** @type {Function} */ nextPrependingEntryFunction = () => null;
}

