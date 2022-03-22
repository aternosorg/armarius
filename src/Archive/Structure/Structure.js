/**
 * @abstract
 */
export default class Structure {
    /**
     * @param {DataReader} reader
     * @returns {Promise<void>}
     * @abstract
     */
    async read(reader) {

    }

    /**
     * @returns {Promise<Uint8Array>}
     * @abstract
     */
    async serialize() {

    }

    /**
     * @param {DataReader} reader
     * @returns {Promise<this>}
     */
    static async fromReader(reader) {
        let structure = new this();
        await structure.read(reader);
        return structure;
    }
}

