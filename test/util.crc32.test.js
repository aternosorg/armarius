import CRC32 from '../src/Util/CRC32.js';

const bytes = new Uint8Array([
    97, 98,  99,  65,  66,  67,  49,  50,  51,
    33, 34,  21,  36,  37,  38,  47,  40,  41,
    61, 63,  44,  46,  45,  95,  58,  59,  35,
    43, 42, 132, 148, 129, 142, 153, 154, 225
]);
const checksum = 4104218655;

test('CRC32 generates correct checksum', () => {
    expect(CRC32.hash(bytes)).toBe(checksum);
});

test('CRC32 generates correct checksum in chunks', () => {
    let crc = new CRC32();
    crc.add(new Uint8Array(bytes.buffer, 0, 10));
    crc.add(new Uint8Array(bytes.buffer, 10, 10));
    crc.add(new Uint8Array(bytes.buffer, 20));
    expect(crc.finish()).toBe(checksum);
});

test('CRC32 reset checksum', () => {
    let crc = new CRC32();
    crc.add(new Uint8Array(bytes.buffer, 0, 10));
    crc.reset();
    crc.add(bytes);
    expect(crc.finish()).toBe(checksum);
});
