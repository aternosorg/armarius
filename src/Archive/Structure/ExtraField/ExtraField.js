import Structure from "../Structure.js";

/**
 * @abstract
 */
export default class ExtraField extends Structure {
    /**
     * Total size of the field
     *
     * This value is ignored in serialization.
     * Instead, the correct value is calculated.
     * @type {number}
     */
    size;

    /**
     * @inheritDoc
     */
    async read(reader) {
        this.size = await reader.getUint16();
    }
}

