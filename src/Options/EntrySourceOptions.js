import Options from "./Options.js";
import Constants from "../Constants.js";
import PassThroughDataProcessor from "../DataProcessor/PassThroughDataProcessor.js";
import DefaultDeflateDataProcessor from '../DataProcessor/DefaultDeflateDataProcessor.js';

const defaultDataProcessors = new Map();
defaultDataProcessors.set(Constants.COMPRESSION_METHOD_STORE, PassThroughDataProcessor);
defaultDataProcessors.set(Constants.COMPRESSION_METHOD_DEFLATE, DefaultDeflateDataProcessor);

/**
 * @typedef {Object} EntrySourceOptionsObject
 * @property {boolean} [forceUTF8FileName]
 * @property {number} [compressionMethod]
 * @property {boolean} [forceZIP64]
 * @property {number} [minMadeByVersion]
 * @property {number} [minExtractionVersion]
 * @property {Date} [modTime]
 * @property {Date} [acTime]
 * @property {Date} [crTime]
 * @property {boolean} [unicodeFileNameField]
 * @property {boolean} [unicodeCommentField]
 * @property {boolean} [extendedTimeStampField]
 * @property {?string} [fileComment]
 * @property {?string} [fileName]
 * @property {number} [internalFileAttributes]
 * @property {number} [externalFileAttributes]
 * @property {Map<number, typeof DataProcessor>} [dataProcessors]
 */


export default class EntrySourceOptions extends Options {
    /** @type {boolean} */ forceUTF8FileName = false;
    /** @type {number} */ compressionMethod = Constants.COMPRESSION_METHOD_DEFLATE;
    /** @type {boolean} */ forceZIP64 = false;
    /** @type {number} */ minMadeByVersion = Constants.MIN_VERSION_DEFLATE;
    /** @type {number} */ minExtractionVersion = Constants.MIN_VERSION_DEFLATE;
    /** @type {?Date} */ modTime = new Date();
    /** @type {?Date} */ acTime = new Date();
    /** @type {?Date} */ crTime = new Date();
    /** @type {boolean} */ unicodeFileNameField = false;
    /** @type {boolean} */ unicodeCommentField = false;
    /** @type {boolean} */ extendedTimeStampField = true;
    /** @type {?string} */ fileComment = null;
    /** @type {?string} */ fileName = null;
    /** @type {number} */ internalFileAttributes = 0;
    /** @type {number} */ externalFileAttributes = 0;
    /** @type {Map<number, typeof DataProcessor>} */ dataProcessors = defaultDataProcessors;
}

