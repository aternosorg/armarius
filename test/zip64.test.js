import {
    ArchiveEntry,
    ArchiveEntryEntrySource,
    CentralDirectoryFileHeader,
    Constants,
    ReadArchive,
    WriteArchive,
    Zip64ExtendedInformation
} from '../index.js';
import {expect, test} from '@jest/globals';
import {ArrayBufferIO, BigInt, CRC32} from 'armarius-io';
import {writeArchiveToBuffer} from './util.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

test('Zip64: serialize does not throw when values are missing', async () => {
    // A field read from an archive where no base field was maxed leaves every
    // value undefined. Serializing it must still produce a valid (all-zero)
    // record instead of throwing.
    let field = new Zip64ExtendedInformation();
    let data = await field.serialize();

    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    expect(data.byteLength).toBe(30);
    expect(view.getUint16(0, true)).toBe(28);
    for (let i = 2; i < data.byteLength; i++) {
        expect(data[i]).toBe(0);
    }
});

/**
 * Build a ZIP whose single stored entry has a Zip64 extended information field
 * in its local header but not in its central directory header. This is what
 * Python's `ZipFile.open(name, 'w', force_zip64=True)` produces for a small
 * file: the streamed local header reserves Zip64 size slots (base sizes set to
 * 0xffffffff) while the central directory, written afterwards with the real
 * small sizes, has no Zip64 field.
 *
 * @param {string} nameStr
 * @param {string} payloadStr
 * @returns {Uint8Array}
 */
function forcedZip64SmallFile(nameStr, payloadStr) {
    let name = encoder.encode(nameStr);
    let payload = encoder.encode(payloadStr);
    let crc = CRC32.hash(payload);
    let flags = Constants.BITFLAG_DATA_DESCRIPTOR;

    let localExtraLength = 20;
    let localHeaderSize = Constants.LENGTH_LOCAL_FILE_HEADER + name.byteLength + localExtraLength;
    let dataDescriptorSize = Constants.LENGTH_DATA_DESCRIPTOR_ZIP64;
    let centralHeaderSize = Constants.LENGTH_CENTRAL_DIR_FILE_HEADER + name.byteLength;
    let centralDirOffset = localHeaderSize + payload.byteLength + dataDescriptorSize;
    let total = centralDirOffset + centralHeaderSize + Constants.LENGTH_END_OF_CENTRAL_DIR;

    let buf = new Uint8Array(total);
    let view = new DataView(buf.buffer);

    // Local file header
    let p = 0;
    view.setUint32(p, Constants.SIGNATURE_LOCAL_FILE_HEADER, true);
    view.setUint16(p + 4, Constants.MIN_VERSION_ZIP64, true);
    view.setUint16(p + 6, flags, true);
    view.setUint16(p + 8, Constants.COMPRESSION_METHOD_STORE, true);
    view.setUint16(p + 10, 0, true);                       // mod time
    view.setUint16(p + 12, 33, true);                      // mod date = 1980-01-01
    view.setUint32(p + 14, 0, true);                       // crc (deferred to descriptor)
    view.setUint32(p + 18, Constants.MAX_UINT32, true);    // compressed size slot
    view.setUint32(p + 22, Constants.MAX_UINT32, true);    // uncompressed size slot
    view.setUint16(p + 26, name.byteLength, true);
    view.setUint16(p + 28, localExtraLength, true);
    buf.set(name, p + 30);
    let ep = p + 30 + name.byteLength;
    view.setUint16(ep, Constants.EXTRAFIELD_TYPE_ZIP64_EXTENDED_INFO, true);
    view.setUint16(ep + 2, 16, true);                      // two 8-byte values
    view.setBigUint64(ep + 4, 0n, true);                   // uncompressed size (unknown while streaming)
    view.setBigUint64(ep + 12, 0n, true);                  // compressed size (unknown while streaming)

    // File data (stored)
    p = localHeaderSize;
    buf.set(payload, p);
    p += payload.byteLength;

    // Zip64 data descriptor
    view.setUint32(p, Constants.SIGNATURE_DATA_DESCRIPTOR, true);
    view.setUint32(p + 4, crc, true);
    view.setBigUint64(p + 8, BigInt(payload.byteLength), true);
    view.setBigUint64(p + 16, BigInt(payload.byteLength), true);
    p += dataDescriptorSize;

    // Central directory header (no Zip64 field, real 32-bit sizes and offset)
    view.setUint32(p, Constants.SIGNATURE_CENTRAL_DIR_FILE_HEADER, true);
    view.setUint16(p + 4, Constants.MIN_VERSION_ZIP64, true);
    view.setUint16(p + 6, Constants.MIN_VERSION_ZIP64, true);
    view.setUint16(p + 8, flags, true);
    view.setUint16(p + 10, Constants.COMPRESSION_METHOD_STORE, true);
    view.setUint16(p + 12, 0, true);
    view.setUint16(p + 14, 33, true);
    view.setUint32(p + 16, crc, true);
    view.setUint32(p + 20, payload.byteLength, true);
    view.setUint32(p + 24, payload.byteLength, true);
    view.setUint16(p + 28, name.byteLength, true);
    view.setUint16(p + 30, 0, true);                       // extra field length
    view.setUint16(p + 32, 0, true);                       // comment length
    view.setUint16(p + 34, 0, true);                       // disk number start
    view.setUint16(p + 36, 0, true);
    view.setUint32(p + 38, 0, true);
    view.setUint32(p + 42, 0, true);                       // local header offset
    buf.set(name, p + 46);
    p += centralHeaderSize;

    // End of central directory record
    view.setUint32(p, Constants.SIGNATURE_END_OF_CENTRAL_DIR, true);
    view.setUint16(p + 4, 0, true);
    view.setUint16(p + 6, 0, true);
    view.setUint16(p + 8, 1, true);
    view.setUint16(p + 10, 1, true);
    view.setUint32(p + 12, centralHeaderSize, true);
    view.setUint32(p + 16, centralDirOffset, true);
    view.setUint16(p + 20, 0, true);

    return buf;
}

test('Zip64: copy an entry whose local header has a Zip64 field but the central directory does not', async () => {
    let zipBytes = forcedZip64SmallFile('a.txt', 'hello world!');
    let payload = encoder.encode('hello world!');

    // Sanity check the crafted archive: central directory has no Zip64 field,
    // but the local header does.
    let source = new ReadArchive(new ArrayBufferIO(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength));
    await source.init();
    let [srcEntry] = await source.getAllEntries();
    expect(srcEntry.zip64ExtendedInformation).toBeFalsy();
    await srcEntry.readLocalFileHeader();
    expect(srcEntry.localFileHeader.getExtraField(Constants.EXTRAFIELD_TYPE_ZIP64_EXTENDED_INFO))
        .toBeInstanceOf(Zip64ExtendedInformation);

    // Re-zip the entry. This used to throw "Cannot convert undefined to a BigInt"
    // while serializing the local header's copied Zip64 field.
    let read = new ReadArchive(new ArrayBufferIO(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength));
    await read.init();
    let entries = await read.getAllEntries();
    let i = 0;
    let out = new WriteArchive(() => i < entries.length ? new ArchiveEntryEntrySource(entries[i++], {}) : null);
    let outData = await writeArchiveToBuffer(out);

    // The rewritten archive must be readable and preserve the content.
    let result = new ReadArchive(new ArrayBufferIO(outData.buffer, outData.byteOffset, outData.byteLength));
    await result.init();
    let [resEntry] = await result.getAllEntries();
    expect(resEntry.getFileNameString()).toBe('a.txt');
    expect(decoder.decode(await resEntry.getData())).toBe('hello world!');
    expect(resEntry.getCrc()).toBe(CRC32.hash(payload));
});
