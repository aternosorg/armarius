import BigInt from "../Util/BigInt";

export default class DataReader {
    /** @type {TextDecoder} */ textDecoder = new TextDecoder();
    /** @type {number} */ byteOffset = 0;
    /** @type {number} */ byteLength;
    /** @type {number} */ offset = 0;
    /** @type {number} */ bufferSize = 4096;

    /**
     * @param {number} cloneOffset
     * @param {?number} cloneLength
     * @returns {Promise<DataReader>}
     * @abstract
     */
    async clone(cloneOffset = 0, cloneLength = null) {
        throw new Error(`clone() is not implemented in ${this.constructor.name}.`);
    }

    /**
     * @param {number} offset
     * @param {number} length
     * @param {boolean} longLived
     * @returns {Promise<Uint8Array>}
     * @abstract
     */
    async readAt(offset, length, longLived = true) {
        throw new Error(`readAt() is not implemented in ${this.constructor.name}.`);
    }

    /**
     * @param {number} length
     * @param {boolean} longLived
     * @returns {Promise<Uint8Array>}
     */
    async read(length, longLived = true) {
        let value = this.readAt(this.offset, length, longLived);
        this.offset += length;
        return value;
    }

    /**
     * @param {number} offset
     * @param {number} length
     * @param {boolean} longLived
     * @returns {Promise<DataView>}
     */
    async readDVAt(offset, length, longLived = true) {
        let data = await this.readAt(offset, length);
        return new DataView(data.buffer, data.byteOffset, data.byteLength);
    }

    /**
     * @param {number} offset
     * @returns {Promise<number>}
     */
    async getInt8At(offset) {
        return (await (this.readDVAt(offset, 1, false))).getInt8(0);
    }

    /**
     * @param {number} offset
     * @returns {Promise<number>}
     */
    async getUint8At(offset) {
        return (await (this.readDVAt(offset, 1, false))).getUint8(0);
    }

    /**
     * @param {number} offset
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getInt16At(offset, littleEndian = true) {
        return (await (this.readDVAt(offset, 2, false))).getInt16(0, littleEndian);
    }

    /**
     * @param {number} offset
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getUint16At(offset, littleEndian = true) {
        return (await (this.readDVAt(offset, 2, false))).getUint16(0, littleEndian);
    }

    /**
     * @param {number} offset
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getInt32At(offset, littleEndian = true) {
        return (await (this.readDVAt(offset, 4, false))).getInt32(0, littleEndian);
    }

    /**
     * @param {number} offset
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getUint32At(offset, littleEndian = true) {
        return (await (this.readDVAt(offset, 4, false))).getUint32(0, littleEndian);
    }

    /**
     * @param {number} offset
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getFloat32At(offset, littleEndian = true) {
        return (await (this.readDVAt(offset, 4, false))).getFloat32(0, littleEndian);
    }

    /**
     * @param {number} offset
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getFloat64At(offset, littleEndian = true) {
        return (await (this.readDVAt(offset, 8, false))).getFloat64(0, littleEndian);
    }

    /**
     * @param {number} offset
     * @param {boolean} littleEndian
     * @returns {Promise<bigint>}
     */
    async getBigInt64At(offset, littleEndian = true) {
        return (await (this.readDVAt(offset, 8, false))).getBigInt64(0, littleEndian);
    }

    /**
     * @param {number} offset
     * @param {boolean} littleEndian
     * @returns {Promise<bigint>}
     */
    async getBigUint64At(offset, littleEndian = true) {
        return this.getBigUint64FromDataView(await this.readDVAt(offset, 8, false), 0, littleEndian);
    }

    /**
     * @param {number} offset
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getInt64At(offset, littleEndian = true) {
        return Number(await this.getBigInt64At(offset, littleEndian));
    }

    /**
     * @param {number} offset
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getUint64At(offset, littleEndian = true) {
        return Number(await this.getBigUint64At(offset, littleEndian));
    }

    /**
     * @returns {Promise<number>}
     */
    async getInt8() {
        let value = await this.getInt8At(this.offset);
        this.offset += 1;
        return value;
    }

    /**
     * @returns {Promise<number>}
     */
    async getUint8() {
        let value = await this.getUint8At(this.offset);
        this.offset += 1;
        return value;
    }

    /**
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getInt16(littleEndian = true) {
        let value = await this.getInt16At(this.offset, littleEndian);
        this.offset += 2;
        return value;
    }

    /**
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getUint16(littleEndian = true) {
        let value = await this.getUint16At(this.offset, littleEndian);
        this.offset += 2;
        return value;
    }

    /**
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getInt32(littleEndian = true) {
        let value = await this.getInt32At(this.offset, littleEndian);
        this.offset += 4;
        return value;
    }

    /**
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getUint32(littleEndian = true) {
        let value = await this.getUint32At(this.offset, littleEndian);
        this.offset += 4;
        return value;
    }

    /**
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getFloat32(littleEndian = true) {
        let value = await this.getFloat32At(this.offset, littleEndian);
        this.offset += 4;
        return value;
    }

    /**
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getFloat64(littleEndian = true) {
        let value = await this.getFloat64At(this.offset, littleEndian);
        this.offset += 8;
        return value;
    }

    /**
     * @param {boolean} littleEndian
     * @returns {Promise<bigint>}
     */
    async getBigInt64(littleEndian = true) {
        let value = await this.getBigInt64At(this.offset, littleEndian);
        this.offset += 8;
        return value;
    }

    /**
     * @param {boolean} littleEndian
     * @returns {Promise<bigint>}
     */
    async getBigUint64(littleEndian = true) {
        let value = await this.getBigUint64At(this.offset, littleEndian);
        this.offset += 8;
        return value;
    }

    /**
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getInt64(littleEndian = true) {
        let value = await this.getInt64At(this.offset, littleEndian);
        this.offset += 8;
        return value;
    }

    /**
     * @param {boolean} littleEndian
     * @returns {Promise<number>}
     */
    async getUint64(littleEndian = true) {
        let value = await this.getUint64At(this.offset, littleEndian);
        this.offset += 8;
        return value;
    }

    /**
     * @param {number} offset
     * @param {number} length
     * @returns {Promise<string>}
     */
    async getStringAt(offset, length) {
        return this.textDecoder.decode(await this.readAt(offset, length));
    }

    /**
     * @param {number} length
     * @returns {Promise<string>}
     */
    async getString(length) {
        let value = await this.getStringAt(this.offset, length);
        this.offset += length;
        return value;
    }

    /**
     * @param {number} offset
     * @returns {DataReader}
     */
    seek(offset) {
        this.offset = offset;
        return this;
    }

    /**
     * @param {number} size
     * @returns {DataReader}
     */
    setMaxBufferSize(size) {
        this.bufferSize = size;
        return this;
    }

    /**
     * @param {DataView} dataView
     * @param {number} byteOffset
     * @param {boolean} littleEndian
     * @return {number|BigInt|bigint}
     * @protected
     */
    getBigUint64FromDataView(dataView, byteOffset, littleEndian) {
        if(DataView.prototype.getBigUint64) {
            return dataView.getBigUint64(byteOffset, littleEndian);
        }
        const [h, l] = littleEndian ? [4, 0] : [0, 4];
        const wh = BigInt(dataView.getUint32(byteOffset + h, littleEndian));
        const wl = BigInt(dataView.getUint32(byteOffset + l, littleEndian));
        return (wh << BigInt(32)) + wl;
    }

    /**
     * Find the last index of a byte sequence or uint32
     *
     * @param {number|Uint8Array} search
     * @param {number} minOffset
     * @param {number} maxOffset
     * @param {number} chunkSize
     * @returns {Promise<number>}
     */
    async lastIndexOf(search, minOffset = 0, maxOffset = this.byteLength, chunkSize = 512) {
        let searchData;
        if(search instanceof Uint8Array) {
            searchData = search;
        }else {
            searchData = new Uint8Array(4);
            (new DataView(searchData.buffer, searchData.byteOffset, searchData.byteLength)).setUint32(0, search, true);
        }

        minOffset = Math.max(0, minOffset);
        maxOffset = Math.min(this.byteLength, maxOffset);
        if(searchData.byteLength === 0) {
            return maxOffset;
        }

        let currentStartOffset;
        while (maxOffset - minOffset >= 0) {
            currentStartOffset = Math.max(maxOffset - chunkSize, minOffset);
            let readLength = Math.min(chunkSize + searchData.byteLength, this.byteLength - currentStartOffset);
            let chunk = await this.readAt(currentStartOffset, readLength, false);

            let index = Infinity;
            while(index > 0 && (index = chunk.lastIndexOf(searchData[0], index - 1)) !== -1) {
                let found = true;
                for(let i = 0; i < searchData.length; i++) {
                    if(searchData[i] !== chunk[index + i]) {
                        found = false;
                        break;
                    }
                }
                if(found) {
                    return currentStartOffset + index;
                }
            }
            maxOffset -= chunkSize;
        }
        return -1;
    }
}

