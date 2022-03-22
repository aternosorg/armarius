'use strict';

let crc32table;


export default class CRC32 {

    /**
     * CRC32 constructor
     */
    constructor() {
        this.table = this.getCRC32Table();
        this.crc = -1;
    }

    /**
     * Get CRC32 table
     * @returns {Uint32Array}
     */
    getCRC32Table() {
        if (crc32table) {
            return crc32table;
        }
        let i = 0, c = 0, b = 0;
        crc32table = new Uint32Array(256);
        for (; i < 256; i++) {
            c = i;
            b = 8;
            while (b--) {
                c = (c >>> 1) ^ ((c & 1) ? 0xEDB88320 : 0);
            }
            crc32table[i] = c;
        }
        return crc32table;
    }

    /**
     * Reset hash
     */
    reset() {
        this.crc = -1;
    }

    /**
     * Add data to hash
     * @param {Uint8Array} values
     */
    add(values) {
        for (let id of values) {
            this.crc = this.table[(this.crc ^ id) & 0xFF] ^ (this.crc >>> 8);
        }
    }

    /**
     * Create hash of arr
     * @param {Uint8Array} arr
     * @returns {number}
     */
    static hash(arr) {
        let instance = new this();
        instance.add(arr);
        return instance.finish();
    }

    /**
     * Return hash
     * @returns {number}
     */
    finish() {
        return (~this.crc >>> 0);
    }
}

