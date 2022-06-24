import BigIntUtils from '../src/Util/BigIntUtils.js';

const bytes = new Uint8Array([122, 251, 111, 20, 16, 100, 157, 198]);
const dataView = new DataView(bytes.buffer);
const littleEndian = 14311705211078441850n;
const bigEndian = 8861798823746641350n;

test('Read bigint polyfill (little endian)', () => {
    expect(BigIntUtils.getBigUint64FromView(dataView, 0, true, false)).toBe(littleEndian);
});

test('Read bigint polyfill (big endian)', () => {
    expect(BigIntUtils.getBigUint64FromView(dataView, 0, false, false)).toBe(bigEndian);
});

test('Write bigint polyfill (little endian)', () => {
    let testBytes = new Uint8Array(8);
    BigIntUtils.setBigUint64InView(new DataView(testBytes.buffer), 0, littleEndian, true, false);
    expect(testBytes).toEqual(bytes);
});

test('Write bigint polyfill (big endian)', () => {
    let testBytes = new Uint8Array(8);
    BigIntUtils.setBigUint64InView(new DataView(testBytes.buffer), 0, bigEndian, false, false);
    expect(testBytes).toEqual(bytes);
});

test('Read bigint (little endian)', () => {
    expect(BigIntUtils.getBigUint64FromView(dataView, 0, true, true)).toBe(littleEndian);
});

test('Read bigint (big endian)', () => {
    expect(BigIntUtils.getBigUint64FromView(dataView, 0, false, true)).toBe(bigEndian);
});

test('Write bigint (little endian)', () => {
    let testBytes = new Uint8Array(8);
    BigIntUtils.setBigUint64InView(new DataView(testBytes.buffer), 0, littleEndian, true, true);
    expect(testBytes).toEqual(bytes);
});

test('Write bigint (big endian)', () => {
    let testBytes = new Uint8Array(8);
    BigIntUtils.setBigUint64InView(new DataView(testBytes.buffer), 0, bigEndian, false, true);
    expect(testBytes).toEqual(bytes);
});
