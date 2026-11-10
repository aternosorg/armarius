import {
    ArchiveEntry,
    ArchiveMerger,
    Constants,
    DataReaderEntrySource, DirectoryEntrySource, ExtendedTimestamp,
    ReadArchive,
    WriteArchive
} from '../index.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FakeDataIO, openFileReader, writeArchive, writeArchiveToBuffer} from './util.js';
import {BigInt, CRC32, ArrayBufferIO, NodeDeflateDataProcessor, NodeInflateDataProcessor} from "armarius-io";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const timestamp = 1655914036000;
const timestampSeconds = Math.floor(timestamp/1000);
const date = new Date(timestamp);

test('Write large file archive', async () => {
    let size = 1024*1024*1024*4+1;
    let fileName = 'file.txt';
    let i = 0;
    let archive = new WriteArchive(() => {
        if(i > 0) {
            return null;
        }
        i++;
        return new DataReaderEntrySource(new FakeDataIO(size, 'a'), {
            fileName: fileName,
        });
    });
    let data = await writeArchiveToBuffer(archive);

    let readArchive = new ReadArchive(new ArrayBufferIO(data.buffer, data.byteOffset, data.byteLength));
    await readArchive.init();
    let entries = await readArchive.getAllEntries();

    assert.strictEqual(archive.zip64, true);
    assert.strictEqual(entries.length, 1);

    let entry = entries.pop();
    assert.strictEqual(entry.getFileNameString(), fileName);
    assert.ok(entry.zip64ExtendedInformation);
    assert.strictEqual(entry.getUncompressedSize(), BigInt(size));
    assert.strictEqual(entry.getCrc(), 126491095);
});

test('Write and read archive using NodeJS data processors', async () => {
    let fileName = 'file.txt';
    let i = 0;
    let payloadString = 'Hello World!';
    let payload = encoder.encode(payloadString);

    let writeDataProcessors = new Map([
        [Constants.COMPRESSION_METHOD_DEFLATE, NodeDeflateDataProcessor]
    ]);

    let readDataProcessors = new Map([
        [Constants.COMPRESSION_METHOD_DEFLATE, NodeInflateDataProcessor]
    ]);

    let archive = new WriteArchive(() => {
        if(i > 0) {
            return null;
        }
        i++;
        return new DataReaderEntrySource(new ArrayBufferIO(payload.buffer, payload.byteOffset, payload.byteLength), {
            fileName: fileName,
            dataProcessors: writeDataProcessors
        });
    });
    let data = await writeArchiveToBuffer(archive);

    let readArchive = new ReadArchive(new ArrayBufferIO(data.buffer, data.byteOffset, data.byteLength), {
        entryOptions: {
            dataProcessors: readDataProcessors
        }
    });
    await readArchive.init();
    let entries = await readArchive.getAllEntries();

    assert.strictEqual(entries.length, 1);

    let entry = entries.pop();
    assert.strictEqual(entry.getFileNameString(), fileName);
    assert.strictEqual(decoder.decode(await entry.getData()), payloadString);
    assert.strictEqual(entry.getCrc(), CRC32.hash(payload));
});

test('Extra fields', async () => {
    let i = 0;
    let fileName = 'file.txt';
    let fileComment = 'file-comment';
    let archive = new WriteArchive(() => {
        if(i >= 1) {
            return null;
        }
        i++;
        return new DataReaderEntrySource(new ArrayBufferIO(encoder.encode(`file-content-${i}`).buffer), {
            fileName: fileName,
            fileComment: fileComment,
            forceZIP64: true,
            modTime: date,
            acTime: date,
            crTime: date,
            unicodeFileNameField: true,
            unicodeCommentField: true,
            extendedTimeStampField: true
        });
    });
    let data = await writeArchiveToBuffer(archive);

    let readArchive = new ReadArchive(new ArrayBufferIO(data.buffer, data.byteOffset, data.byteLength));
    await readArchive.init();
    let entries = await readArchive.getAllEntries();

    assert.strictEqual(entries.length, 1);
    assert.strictEqual(readArchive.isZip64, true);

    let entry = entries.pop();
    assert.strictEqual(entry.getFileNameString(), fileName);
    assert.strictEqual(entry.getFileCommentString(), fileComment);
    assert.ok(entry.zip64ExtendedInformation);
    assert.ok(entry.extendedTimestamp);
    assert.ok(entry.unicodeFileComment);
    assert.ok(entry.unicodeFileName);
    assert.strictEqual(entry.unicodeFileName?.crc32, entry.getFileNameCrc());
    assert.strictEqual(entry.unicodeFileComment?.crc32, entry.getFileCommentCrc());
    assert.deepStrictEqual(entry.getLastModDate(), date);

    let centralTimestampField = entry.extendedTimestamp;
    assert.strictEqual(centralTimestampField.modTime, timestampSeconds);
    assert.strictEqual(centralTimestampField.acTime, undefined);
    assert.strictEqual(centralTimestampField.crTime, undefined);

    await entry.readLocalFileHeader();
    /** @type {ExtendedTimestamp} */
    let localTimestampField = entry.localFileHeader.getExtraField(Constants.EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP);
    assert.ok(localTimestampField instanceof ExtendedTimestamp);
    assert.strictEqual(localTimestampField.modTime, timestampSeconds);
    assert.strictEqual(localTimestampField.acTime, timestampSeconds);
    assert.strictEqual(localTimestampField.crTime, timestampSeconds);
});

test('Merge archives', async () => {
    async function makeArchive(fileName) {
        let i = 0;
        let archive = new WriteArchive(() => {
            if(i >= 1) {
                return null;
            }
            i++;
            return new DataReaderEntrySource(new ArrayBufferIO(encoder.encode(`file-content-${fileName}`).buffer), {
                fileName: fileName,
            });
        });

        return await writeArchiveToBuffer(archive);
    }

    let data1 = await makeArchive('file1.txt');
    let data2 = await makeArchive('file2.txt');

    let archive1 = new ReadArchive(new ArrayBufferIO(data1.buffer, data1.byteOffset, data1.byteLength));
    let archive2 = new ReadArchive(new ArrayBufferIO(data2.buffer, data2.byteOffset, data2.byteLength));
    await archive1.init();
    await archive2.init();

    let merger = new ArchiveMerger([archive1, archive2]);
    let resData = await writeArchiveToBuffer(merger.outputArchive);

    let archive = new ReadArchive(new ArrayBufferIO(resData.buffer, resData.byteOffset, resData.byteLength));
    await archive.init();
    let entries = await archive.getAllEntries();

    assert.ok(entries.find(e => e.fileNameString === 'file1.txt') instanceof ArchiveEntry);
    assert.ok(entries.find(e => e.fileNameString === 'file2.txt') instanceof ArchiveEntry);
});

test('Clone entry iterator', async () => {
    let i = 0;
    let fileName = 'file.txt';
    let fileComment = 'file-comment';
    let archive = new WriteArchive(() => {
        if(i >= 2) {
            return null;
        }
        i++;
        return new DataReaderEntrySource(new ArrayBufferIO(encoder.encode(`file-content-${i}`).buffer), {
            fileName: `file-${i}.txt`,
        });
    });
    let data = await writeArchiveToBuffer(archive);

    let readArchive = new ReadArchive(new ArrayBufferIO(data.buffer, data.byteOffset, data.byteLength));
    await readArchive.init();

    let entryIterator = await readArchive.getEntryIterator();
    assert.strictEqual((await entryIterator.next()).getFileNameString(), 'file-1.txt');

    let clone = await entryIterator.clone();
    assert.strictEqual((await entryIterator.next()).getFileNameString(), (await clone.next()).getFileNameString());
});

test('Empty directories', async () => {
    let archive = new WriteArchive((function *() {
        for(let i = 0; i < 10; i++) {
            yield new DirectoryEntrySource({
                fileName: `dir-${i}`,
            })
        }
    })());
    let data = await writeArchiveToBuffer(archive);

    let readArchive = new ReadArchive(new ArrayBufferIO(data.buffer, data.byteOffset, data.byteLength));
    await readArchive.init();

    let entries = await readArchive.getAllEntries();
    assert.strictEqual(entries.length, 10);
    let entry = entries.shift();
    assert.strictEqual(entry.getFileNameString(), 'dir-0/');
    assert.strictEqual(entry.isDirectory(), true);
});
