
/**
 * @interface
 */
export default class DataProcessor {
    /**
     * @return {boolean}
     * @abstract
     */
    static isSupported() {
    }

    /**
     * @return {?CRC32}
     */
    getPreCrc() {
    }

    /**
     * @return {?CRC32}
     */
    getPostCrc() {
    }

    /**
     * @param {number} length
     * @return {Promise<?Uint8Array>}
     * @protected
     * @abstract
     */
    async generate(length) {
    }

    /**
     * @param {number} length
     * @return {Promise<?Uint8Array>}
     */
    async read(length) {
    }

    /**
     * @return {Promise<void>}
     */
    async reset() {
    }
}

