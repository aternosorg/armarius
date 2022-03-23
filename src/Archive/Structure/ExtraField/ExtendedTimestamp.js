import ExtraField from "./ExtraField.js";

export default class ExtendedTimestamp extends ExtraField {
    /** @type {number} */ bitFlag;
    /** @type {number} */ modTime;
    /** @type {number} */ acTime;
    /** @type {number} */ crTime;

    /**
     * @type {boolean}
     * @protected
     */
    centralDirMode;

    /**
     * @inheritDoc
     */
    async read(reader) {
        await super.read(reader);
        this.bitFlag = await reader.getUint8();

        this.modTime = await reader.getUint32();
        if (this.size === 5) {
            this.centralDirMode = true;
            return;
        }

        this.acTime = await reader.getUint32();
        this.crTime = await reader.getUint32();
    }

    /**
     * @inheritDoc
     */
    async serialize() {
        let dataSize = this.centralDirMode ? 5 : 13;

        let data = new Uint8Array(dataSize + 2);
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        view.setUint16(0, dataSize, true);
        view.setUint8(2, this.bitFlag);
        view.setUint32(3, this.modTime, true);
        if (!this.centralDirMode) {
            view.setUint32(7, this.acTime, true);
            view.setUint32(11, this.crTime, true);
        }

        return data;
    }

    /**
     * @param {number} flag
     * @returns {boolean}
     */
    getFlag(flag) {
        return (this.bitFlag & flag) === flag;
    }

    /**
     * @returns {?number}
     */
    getModTime() {
        if (!this.getFlag(0x1)) {
            return null;
        }
        return this.modTime;
    }

    /**
     * @returns {?number}
     */
    getAcTime() {
        if (!this.getFlag(0x2) || this.size === 5) {
            return null;
        }
        return this.acTime;
    }

    /**
     * @returns {?number}
     */
    getCrTime() {
        if (!this.getFlag(0x4) || this.size === 5) {
            return null;
        }
        return this.crTime;
    }

    /**
     * @param {boolean} enabled
     * @returns {ExtendedTimestamp}
     */
    setCentralDirMode(enabled) {
        this.centralDirMode = enabled;
        return this;
    }
}

