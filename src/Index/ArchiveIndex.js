import CRC32 from "../Util/CRC32.js";
import ArmariusError from '../Error/ArmariusError.js';
const encoder = new TextEncoder();

/**
 * Storing thousands of archive entries in RAM can be problematic on low-end devices.
 * However, going through all entries of the central directory on disk every time we look for a specific file
 * can be really slow.
 * This index stores at what offsets within the central directory certain files can be found while using
 * as little RAM as possible.
 */
export default class ArchiveIndex {
    /** @type {Uint32Array[]} */ insertData = [];
    /** @type {?Uint32Array} */ finalizedCrcData = null;
    /** @type {?Uint32Array} */ finalizedOffsetData = null;
    /** @type {boolean} */ finalized = false;

    /**
     * Binary search
     *
     * @param {number} value
     * @param {number} offset
     * @param {number} limit
     * @protected
     * @returns {number|null}
     */
    find(value, offset = 0, limit = this.finalizedCrcData.length) {
        let splitAfter = Math.floor(limit / 2);
        let globalSplitOffset = offset + splitAfter;
        let currentValue = this.finalizedCrcData[globalSplitOffset];
        if(currentValue === value) {
            return globalSplitOffset;
        }
        if(limit <= 1) {
            return null;
        }

        if(currentValue > value) {
            return this.find(value, offset, splitAfter);
        }
        return this.find(value, globalSplitOffset, limit - splitAfter);
    }

    /**
     * @param {string} filename
     * @returns {number}
     */
    static getFilenameCrc(filename) {
        return CRC32.hash(encoder.encode(filename));
    }

    /**
     * @param {string} filename
     * @returns {number[]}
     */
    getPossibleOffsets(filename) {
        return this.getPossibleOffsetsByHash(this.constructor.getFilenameCrc(filename));
    }

    /**
     * @param {number} crc
     * @returns {number[]}
     */
    getPossibleOffsetsByHash(crc) {
        if(!this.finalized) {
            throw new ArmariusError('Index is not finalized');
        }
        let firstIndex = this.find(crc);
        if(firstIndex === null) {
            return [];
        }
        let result = [this.finalizedOffsetData[firstIndex]];

        let offset = 1;
        while (this.finalizedCrcData[firstIndex - offset] === crc) {
            result.push(this.finalizedOffsetData[firstIndex - offset]);
            offset++;
        }

        offset = 1;
        while (this.finalizedCrcData[firstIndex + offset] === crc) {
            result.push(this.finalizedOffsetData[firstIndex + offset]);
            offset++;
        }

        return result;
    }

    /**
     * @param {string} filename
     * @param {number} offset
     */
    add(filename, offset) {
        this.insertData.push(new Uint32Array([this.constructor.getFilenameCrc(filename), offset]));
    }

    /**
     * Finalize and sort entries to allow efficient search
     *
     */
    finalize() {
        let sorted = this.insertData.sort((a, b) => a[0] - b[0]);
        this.insertData = [];
        this.finalizedCrcData = new Uint32Array(sorted.length);
        this.finalizedOffsetData = new Uint32Array(sorted.length);

        let i = 0;
        for(let [crc, offset] of sorted) {
            this.finalizedOffsetData[i] = offset;
            this.finalizedCrcData[i] = crc;
            i++;
        }
        this.finalized = true;
    }
}

