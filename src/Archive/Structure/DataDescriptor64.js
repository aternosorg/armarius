import DataDescriptor from "./DataDescriptor.js";
import Constants from "../../Constants.js";

export default class DataDescriptor64 extends DataDescriptor {
    /**
     * @inheritDoc
     */
    async read(reader) {
        this.setSignature(await reader.getUint32());
        this.crc32 = await reader.getUint32();
        this.compressedSize = await reader.getBigUint64();
        this.uncompressedSize = await reader.getBigUint64();
    }

    /**
     * @inheritDoc
     */
    async serialize() {
        let data = new Uint8Array(Constants.LENGTH_DATA_DESCRIPTOR_ZIP64);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        view.setUint32(0, this.signature, true);
        view.setUint32(4, this.crc32, true);
        view.setBigUint64(8, this.compressedSize, true);
        view.setBigUint64(16, this.uncompressedSize, true);

        return data;
    }
}

