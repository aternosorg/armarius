
/**
 * @interface
 */
export default class DataProcessor {
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
     * @return {Promise<Uint8Array>}
     */
    async getChunkFromReader(length) {
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

    reset() {
    }
}

