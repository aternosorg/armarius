import FileHeader from "./FileHeader.js";
import Constants from "../../Constants.js";

export default class LocalFileHeader extends FileHeader {
    /**
     * Local file header signature
     * @type {number}
     */
    signature = Constants.SIGNATURE_LOCAL_FILE_HEADER;

    /**
     * @inheritDoc
     */
    async read(reader) {
        this.setSignature(await reader.getUint32());
        this.extractionVersion = await reader.getUint16();
        this.bitFlag = await reader.getUint16();
        this.compressionMethod = await reader.getUint16();
        this.fileModTime = await reader.getUint16();
        this.fileModDate = await reader.getUint16();
        this.crc32 = await reader.getUint32();
        this.compressedSize = await reader.getUint32();
        this.uncompressedSize = await reader.getUint32();
        this.fileNameLength = await reader.getUint16();
        this.extraFieldLength = await reader.getUint16();

        this.fileName = await reader.read(this.fileNameLength);
        this.extraField = await reader.read(this.extraFieldLength);

        await this.loadExtraFields();
    }

    async serialize() {
        await this.serializeExtraFields();
        let data = new Uint8Array(Constants.LENGTH_LOCAL_FILE_HEADER +
            this.fileName.byteLength + this.extraField.byteLength);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        view.setUint32(0, this.signature, true);
        view.setUint16(4, this.extractionVersion, true);
        view.setUint16(6, this.bitFlag, true);
        view.setUint16(8, this.compressionMethod, true);
        view.setUint16(10, this.fileModTime, true);
        view.setUint16(12, this.fileModDate, true);
        view.setUint32(14, this.crc32, true);
        view.setUint32(18, this.compressedSize, true);
        view.setUint32(22, this.uncompressedSize, true);
        view.setUint16(26, this.fileName.byteLength, true);
        view.setUint16(28, this.extraField.byteLength, true);

        data.set(this.fileName, 30);
        data.set(this.extraField, 30 + this.fileName.byteLength);

        return data;
    }

    /**
     * @inheritDoc
     */
    static getSignature() {
        return Constants.SIGNATURE_LOCAL_FILE_HEADER;
    }
}

