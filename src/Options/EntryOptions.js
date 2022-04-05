import Options from "./Options.js";
import Constants from "../Constants.js";
import PassThroughDataProcessor from "../DataProcessor/PassThroughDataProcessor.js";
import InflateDataProcessor from "../DataProcessor/InflateDataProcessor.js";

const defaultDataProcessors = new Map();
defaultDataProcessors.set(Constants.COMPRESSION_METHOD_STORE, PassThroughDataProcessor);
defaultDataProcessors.set(Constants.COMPRESSION_METHOD_DEFLATE, InflateDataProcessor);

/**
 * @typedef {Object} EntryOptionsObject
 * @property {Map<number, function(new:DataProcessor)>} [dataProcessors]
 */

export default class EntryOptions extends Options {
    /** @type {Map<number, function(new:DataProcessor)>} */ dataProcessors = defaultDataProcessors;
}

