export default class EntryIteratorInterface {
    /**
     * @abstract
     */
    reset() {

    }

    /**
     * @return {Promise<this>}
     * @abstract
     */
    async clone() {

    }

    /**
     * @returns {Promise<?ArchiveEntry>}
     * @abstract
     */
    async next() {

    }
}
