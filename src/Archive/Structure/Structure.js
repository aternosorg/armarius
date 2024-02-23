/**
 * @abstract
 */
export default class Structure {
    /**
     * @param {import("armarius-io").IO} io
     * @returns {Promise<void>}
     * @abstract
     */
    async read(io) {

    }

    /**
     * @returns {Promise<Uint8Array>}
     * @abstract
     */
    async serialize() {

    }

    /**
     * @param {import("armarius-io").IO} io
     * @returns {Promise<this>}
     */
    static async fromIO(io) {
        let structure = new this();
        await structure.read(io);
        return structure;
    }
}

