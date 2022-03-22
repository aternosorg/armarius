import SignatureStructure from "./SignatureStructure.js";
import ArrayBufferReader from "../../Reader/ArrayBufferReader.js";
import GenericExtraField from "./ExtraField/GenericExtraField.js";
import constants from "../../constants.js";
import Zip64ExtendedInformation from "./ExtraField/Zip64ExtendedInformation.js";
import UnicodeExtraField from "./ExtraField/UnicodeExtraField.js";
import ExtendedTimestamp from "./ExtraField/ExtendedTimestamp.js";

/**
 * @abstract
 */
export default class FileHeader extends SignatureStructure {
    /**
     * Version needed to extract
     * @type {number}
     */
    extractionVersion;

    /**
     * General purpose bit flag
     * @type {number}
     */
    bitFlag;

    /**
     * Compression method
     * @type {number}
     */
    compressionMethod;

    /**
     * Last mod file time
     * @type {number}
     */
    fileModTime;

    /**
     * Last mod file date
     * @type {number}
     */
    fileModDate;

    /**
     * CRC-32
     * @type {number}
     */
    crc32;

    /**
     * Compressed size
     * @type {number}
     */
    compressedSize;

    /**
     * Uncompressed size
     * @type {number}
     */
    uncompressedSize;

    /**
     * File name length
     *
     * This value is ignored in serialization.
     * Instead, the correct value is calculated.
     * @type {number}
     */
    fileNameLength;

    /**
     * Extra field length
     *
     * This value is ignored in serialization.
     * Instead, the correct value is calculated.
     * @type {number}
     */
    extraFieldLength;

    /**
     * File name
     * @type {Uint8Array}
     */
    fileName;

    /**
     * Extra field
     * @type {Uint8Array}
     */
    extraField;

    /**
     * @type {Map<number, ExtraField>}
     * @protected
     */
    extraFields = new Map();

    /**
     * @returns {Promise<Uint8Array>}
     */
    async serializeExtraFields() {
        let extra = new Map();
        let length = 0;
        for (let [type, field] of this.extraFields) {
            let data = await field.serialize();
            extra.set(type, data);
            length += data.byteLength + 2;
        }

        let data = new Uint8Array(length);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        let offset = 0;
        for (let [type, fieldData] of extra) {
            view.setUint16(offset, type, true);
            data.set(fieldData, offset + 2);
            offset += fieldData.byteLength + 2;
        }

        this.extraField = data;
        return data;
    }

    /**
     * @param {number} type
     * @returns {null|ExtraField}
     */
    getExtraField(type) {
        if (!this.extraFields.has(type)) {
            return null;
        }
        return this.extraFields.get(type);
    }

    /**
     * @return {Map<number, ExtraField>}
     */
    getExtraFields() {
        return this.extraFields;
    }

    /**
     * @param {number} type
     * @param {ExtraField} field
     * @returns {FileHeader}
     */
    setExtraField(type, field) {
        this.extraFields.set(type, field);
        return this;
    }

    /**
     * @protected
     * @returns {Map<number, ExtraField>}
     */
    async loadExtraFields() {
        this.extraFields = new Map();
        let rawBuffer = this.extraField;
        let reader = new ArrayBufferReader(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.byteLength);
        try {
            while (reader.offset < reader.byteLength) {
                const type = await reader.getUint16();

                let startOffset = reader.offset;
                let field = await this.loadExtraField(type, reader);
                reader.seek(startOffset + field.size);

                this.extraFields.set(type, field);
            }
        } catch (e) {
        }
        return this.extraFields;
    }

    /**
     * @param {number} type
     * @param {DataReader} reader
     * @protected
     * @returns {Promise<ExtraField>}
     */
    async loadExtraField(type, reader) {
        switch (type) {
            case constants.EXTRAFIELD_TYPE_ZIP64_EXTENDED_INFO:
                return await Zip64ExtendedInformation.fromReader(reader);
            case constants.EXTRAFIELD_TYPE_UNICODE_FILENAME:
            case constants.EXTRAFIELD_TYPE_UNICODE_COMMENT:
                return await UnicodeExtraField.fromReader(reader);
            case constants.EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP:
                return await ExtendedTimestamp.fromReader(reader);
            default:
                return await GenericExtraField.fromReader(reader);
        }
    }

    /**
     * @param {number} flag
     * @returns {number}
     */
    getFlag(flag) {
        return this.bitFlag & flag === flag;
    }
}

