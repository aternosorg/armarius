import BigInt from "./BigInt.js";

export default class BigIntUtils {
    /**
     * @param {DataView} dataView
     * @param {number} byteOffset
     * @param {boolean} littleEndian
     * @param {boolean} native
     * @return {number|BigInt}
     */
    static getBigUint64FromView(dataView, byteOffset, littleEndian, native = true) {
        if(DataView.prototype.getBigUint64 && native) {
            return dataView.getBigUint64(byteOffset, littleEndian);
        }
        const [h, l] = littleEndian ? [4, 0] : [0, 4];
        const wh = BigInt(dataView.getUint32(byteOffset + h, littleEndian));
        const wl = BigInt(dataView.getUint32(byteOffset + l, littleEndian));
        return (wh << BigInt(32)) + wl;
    }

    /**
     * @param {DataView} dataView
     * @param {number} byteOffset
     * @param {BigInt} value
     * @param {boolean} littleEndian
     * @param {boolean} native
     * @returns {void}
     */
    static setBigUint64InView(dataView, byteOffset, value, littleEndian, native = true) {
        if(DataView.prototype.setBigUint64 && native) {
            return dataView.setBigUint64(byteOffset, value, littleEndian);
        }
        const wh = Number((value >> BigInt(32)) & BigInt(0xFFFFFFFF));
        const wl = Number(value & BigInt(0xFFFFFFFF));
        const [h, l] = littleEndian ? [4, 0] : [0, 4];
        dataView.setUint32(byteOffset + h, wh, littleEndian);
        dataView.setUint32(byteOffset + l, wl, littleEndian);
    }
}
