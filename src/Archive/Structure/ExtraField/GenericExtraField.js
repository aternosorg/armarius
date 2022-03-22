import ExtraField from "./ExtraField.js";

export default class GenericExtraField extends ExtraField {
    /** @type {Uint8Array} */ data;

    /**
     * @inheritDoc
     */
    async read(reader) {
        await super.read(reader);
        this.data = await reader.read(this.size);
    }

    /**
     * @inheritDoc
     */
    async serialize() {
        let data = new Uint8Array(4 + this.data.byteLength);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        view.setUint16(0, this.data.byteLength, true);
        data.set(this.data, 2);

        return data;
    }
}

