import Options from "./Options.js";

/**
 * @typedef {Object} WriteArchiveOptionsObject
 * @property {boolean} [forceZIP64]
 */


export default class WriteArchiveOptions extends Options{
    /** @type {boolean} */ forceZIP64 = false;
}

