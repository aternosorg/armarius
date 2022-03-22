/**
 * @abstract
 */
export default class DataProcessor {
    /**
     * @param {Uint8Array} data
     * @param {boolean} lastChunk
     * @returns {Promise<Uint8Array>}
     * @abstract
     */
    async process(data, lastChunk = false) {

    }

    /**
     * @abstract
     */
    reset() {

    }
}

