import Options from "./Options.js";
import Constants from "../Constants.js";
import {PassThroughDataProcessor, DefaultInflateDataProcessor} from "armarius-io";

const defaultDataProcessors = new Map();
defaultDataProcessors.set(Constants.COMPRESSION_METHOD_STORE, PassThroughDataProcessor);
defaultDataProcessors.set(Constants.COMPRESSION_METHOD_DEFLATE, DefaultInflateDataProcessor);

/**
 * @typedef {Object} EntryOptionsObject
 * @property {Map<number, typeof DataProcessor>} [dataProcessors]
 */

export default class EntryOptions extends Options {
    /** @type {Map<number, typeof DataProcessor>} */ dataProcessors = defaultDataProcessors;
}

