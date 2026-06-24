import Options from "./Options.js";
import Constants from "../Constants.js";
import {PassThroughDataProcessor, DefaultInflateDataProcessor} from "armarius-io";

const defaultDataProcessors = new Map();
defaultDataProcessors.set(Constants.COMPRESSION_METHOD_STORE, PassThroughDataProcessor);
defaultDataProcessors.set(Constants.COMPRESSION_METHOD_DEFLATE, DefaultInflateDataProcessor);

/**
 * @typedef {Object} EntryOptionsObject
 * @property {Map<number, typeof import("armarius-io").DataProcessor>} [dataProcessors]
 * @property {boolean} [allowTrailingSlashInFileName]
 * @property {boolean} [allowBackslashSeparators] - Interpret a trailing backslash as a separator, making the entry a directory
 */

export default class EntryOptions extends Options {
    /** @type {Map<number, typeof import("armarius-io").DataProcessor>} */ dataProcessors = defaultDataProcessors;
    /** @type {boolean} */ allowTrailingSlashInFileName = false;
    /** @type {boolean} */ allowBackslashSeparators = false;
}

