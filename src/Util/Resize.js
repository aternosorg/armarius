export default class Resize {

    /**
     * @param {Uint8Array} uint8Array
     * @param {number} length
     */
    static resizeBuffer(uint8Array, length) {
        if (uint8Array.byteLength === length) {
            return uint8Array;
        }
        let buffer = uint8Array.buffer;
        if (buffer.resizable) {
            let buffer = uint8Array.buffer;
            buffer.resize(uint8Array.byteOffset + length);
            return new Uint8Array(buffer, uint8Array.byteOffset, length);
        }

        let res = new Uint8Array(length);
        res.set(uint8Array);
        return res;
    }
}
