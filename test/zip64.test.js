import {
    ArchiveEntry,
    CentralDirectoryFileHeader,
    Constants,
    Zip64ExtendedInformation
} from '../index.js';
import {expect, test} from '@jest/globals';
import {ArrayBufferIO, BigInt} from 'armarius-io';

/**
 * Build the raw bytes of a Zip64 extended information extra field body, i.e.
 * everything after the 2-byte type tag: the 2-byte size followed by the given
 * values in order. This is what Zip64ExtendedInformation.read() consumes.
 *
 * @param {Array<{bits: 32|64, value: number|BigInt}>} values
 * @returns {ArrayBufferIO}
 */
function zip64FieldIO(values) {
    let bodyLength = values.reduce((sum, v) => sum + (v.bits === 64 ? 8 : 4), 0);
    let buf = new Uint8Array(2 + bodyLength);
    let view = new DataView(buf.buffer);
    view.setUint16(0, bodyLength, true);
    let offset = 2;
    for (let v of values) {
        if (v.bits === 64) {
            view.setBigUint64(offset, BigInt(v.value), true);
            offset += 8;
        } else {
            view.setUint32(offset, Number(v.value), true);
            offset += 4;
        }
    }
    return new ArrayBufferIO(buf.buffer, buf.byteOffset, buf.byteLength);
}

/**
 * Build a full central directory file header buffer with a fixed set of base
 * field values and a raw extra field blob.
 *
 * @param {Object} opts
 * @param {number} opts.compressedSize
 * @param {number} opts.uncompressedSize
 * @param {number} opts.diskNumberStart
 * @param {number} opts.localHeaderOffset
 * @param {Uint8Array} opts.extraField
 * @returns {ArrayBufferIO}
 */
function centralDirectoryHeaderIO(opts) {
    let fileName = new Uint8Array(0);
    let fileComment = new Uint8Array(0);
    let extraField = opts.extraField ?? new Uint8Array(0);

    let buf = new Uint8Array(Constants.LENGTH_CENTRAL_DIR_FILE_HEADER +
        fileName.byteLength + extraField.byteLength + fileComment.byteLength);
    let view = new DataView(buf.buffer);

    view.setUint32(0, Constants.SIGNATURE_CENTRAL_DIR_FILE_HEADER, true);
    view.setUint16(4, Constants.MIN_VERSION_ZIP64, true);
    view.setUint16(6, Constants.MIN_VERSION_ZIP64, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, Constants.COMPRESSION_METHOD_STORE, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, 0, true);
    view.setUint32(20, opts.compressedSize, true);
    view.setUint32(24, opts.uncompressedSize, true);
    view.setUint16(28, fileName.byteLength, true);
    view.setUint16(30, extraField.byteLength, true);
    view.setUint16(32, fileComment.byteLength, true);
    view.setUint16(34, opts.diskNumberStart, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, opts.localHeaderOffset, true);

    let offset = Constants.LENGTH_CENTRAL_DIR_FILE_HEADER;
    buf.set(fileName, offset);
    offset += fileName.byteLength;
    buf.set(extraField, offset);
    offset += extraField.byteLength;
    buf.set(fileComment, offset);

    return new ArrayBufferIO(buf.buffer, buf.byteOffset, buf.byteLength);
}

const MAX32 = Constants.MAX_UINT32;
const MAX16 = Constants.MAX_UINT16;

test('Zip64: reads all fields when every base field is maxed', async () => {
    let field = await Zip64ExtendedInformation.fromIO(
        zip64FieldIO([
            {bits: 64, value: 10n},
            {bits: 64, value: 20n},
            {bits: 64, value: 30n},
            {bits: 32, value: 2},
        ]),
        {compressedSize: MAX32, uncompressedSize: MAX32, localHeaderOffset: MAX32, diskNumberStart: MAX16}
    );

    expect(field.uncompressedSize).toBe(10n);
    expect(field.compressedSize).toBe(20n);
    expect(field.localHeaderOffset).toBe(30n);
    expect(field.diskNumberStart).toBe(2);
});

test('Zip64: only the local header offset is maxed (regression: must not be read as uncompressedSize)', async () => {
    // Sizes fit in 32 bits, but the local header offset is >= 4 GiB, so the
    // field holds only the 8-byte offset.
    let field = await Zip64ExtendedInformation.fromIO(
        zip64FieldIO([
            {bits: 64, value: 0x1_0000_0000n},
        ]),
        {compressedSize: 100, uncompressedSize: 200, localHeaderOffset: MAX32, diskNumberStart: 0}
    );

    expect(field.uncompressedSize).toBeUndefined();
    expect(field.compressedSize).toBeUndefined();
    expect(field.localHeaderOffset).toBe(0x1_0000_0000n);
    expect(field.diskNumberStart).toBeUndefined();
});

test('Zip64: only the compressed size is maxed', async () => {
    let field = await Zip64ExtendedInformation.fromIO(
        zip64FieldIO([
            {bits: 64, value: 0x2_0000_0000n},
        ]),
        {compressedSize: MAX32, uncompressedSize: 200, localHeaderOffset: 500, diskNumberStart: 0}
    );

    expect(field.uncompressedSize).toBeUndefined();
    expect(field.compressedSize).toBe(0x2_0000_0000n);
    expect(field.localHeaderOffset).toBeUndefined();
    expect(field.diskNumberStart).toBeUndefined();
});

test('Zip64: both sizes maxed but offset is not (common large-file case)', async () => {
    let field = await Zip64ExtendedInformation.fromIO(
        zip64FieldIO([
            {bits: 64, value: 0x1_0000_0001n},
            {bits: 64, value: 0x1_0000_0002n},
        ]),
        {compressedSize: MAX32, uncompressedSize: MAX32, localHeaderOffset: 1234, diskNumberStart: 0}
    );

    expect(field.uncompressedSize).toBe(0x1_0000_0001n);
    expect(field.compressedSize).toBe(0x1_0000_0002n);
    expect(field.localHeaderOffset).toBeUndefined();
    expect(field.diskNumberStart).toBeUndefined();
});

test('Zip64: disk number start uses the 16-bit sentinel', async () => {
    let field = await Zip64ExtendedInformation.fromIO(
        zip64FieldIO([
            {bits: 32, value: 7},
        ]),
        {compressedSize: 1, uncompressedSize: 2, localHeaderOffset: 3, diskNumberStart: MAX16}
    );

    expect(field.uncompressedSize).toBeUndefined();
    expect(field.compressedSize).toBeUndefined();
    expect(field.localHeaderOffset).toBeUndefined();
    expect(field.diskNumberStart).toBe(7);
});

test('Zip64: without a header, falls back to reading every field that fits', async () => {
    let field = await Zip64ExtendedInformation.fromIO(
        zip64FieldIO([
            {bits: 64, value: 11n},
            {bits: 64, value: 22n},
        ])
    );

    expect(field.uncompressedSize).toBe(11n);
    expect(field.compressedSize).toBe(22n);
    expect(field.localHeaderOffset).toBeUndefined();
    expect(field.diskNumberStart).toBeUndefined();
});

test('Zip64: parsed through a central directory header, offset-only field, stays aligned', async () => {
    // Append a second (generic) extra field after the zip64 field to prove the
    // header parser stays aligned using the declared field size even though the
    // zip64 field body is shorter than the full 28 bytes.
    let zip64Blob = new Uint8Array([
        0x01, 0x00,             // tag 0x0001
        0x08, 0x00,             // size 8
        0, 0, 0, 0, 0x01, 0, 0, 0, // 0x1_00000000 little-endian
    ]);
    let genericBlob = new Uint8Array([
        0xaa, 0xbb,             // some unknown tag
        0x02, 0x00,             // size 2
        0x42, 0x43,             // payload
    ]);
    let extraField = new Uint8Array(zip64Blob.byteLength + genericBlob.byteLength);
    extraField.set(zip64Blob, 0);
    extraField.set(genericBlob, zip64Blob.byteLength);

    let header = await CentralDirectoryFileHeader.fromIO(centralDirectoryHeaderIO({
        compressedSize: 100,
        uncompressedSize: 200,
        diskNumberStart: 0,
        localHeaderOffset: MAX32,
        extraField
    }));

    let zip64 = header.getExtraField(Constants.EXTRAFIELD_TYPE_ZIP64_EXTENDED_INFO);
    expect(zip64).toBeInstanceOf(Zip64ExtendedInformation);
    expect(zip64.localHeaderOffset).toBe(0x1_0000_0000n);
    expect(zip64.uncompressedSize).toBeUndefined();
    expect(zip64.compressedSize).toBeUndefined();

    // The following extra field must still be found, proving no misalignment.
    let generic = header.getExtraField(0xbbaa);
    expect(generic).toBeTruthy();
    expect(generic.size).toBe(2);
});

test('Zip64: entry getters return defined values for an offset-only field (repack regression)', async () => {
    // This is the exact path that fed the writer and crashed before the fix:
    // when only the local header offset was moved into the zip64 field, the
    // mis-parsed field left the value the getters needed undefined, which blew
    // up in setBigUint64 during re-serialization.
    let zip64Blob = new Uint8Array([
        0x01, 0x00,                 // tag 0x0001
        0x08, 0x00,                 // size 8
        0, 0, 0, 0, 0x01, 0, 0, 0,  // local header offset = 0x1_00000000
    ]);

    let entry = new ArchiveEntry(/** @type {*} */ ({}), {});
    await entry.readCentralDirectoryHeader(centralDirectoryHeaderIO({
        compressedSize: 100,
        uncompressedSize: 200,
        diskNumberStart: 0,
        localHeaderOffset: MAX32,
        extraField: zip64Blob
    }), 0);

    expect(entry.zip64ExtendedInformation).toBeInstanceOf(Zip64ExtendedInformation);

    // Offset is maxed in the base header, so it comes from the zip64 field.
    expect(entry.getLocalHeaderOffset()).toBe(0x1_0000_0000n);
    // Sizes are not maxed, so they come from the base header and stay defined.
    expect(entry.getCompressedSize()).toBe(BigInt(100));
    expect(entry.getUncompressedSize()).toBe(BigInt(200));

    // None of the values the writer needs are undefined, so building a fresh
    // zip64 field from them would not throw.
    for (let value of [entry.getLocalHeaderOffset(), entry.getCompressedSize(), entry.getUncompressedSize()]) {
        expect(value).not.toBeUndefined();
        expect(typeof value).toBe('bigint');
    }
});
