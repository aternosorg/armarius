import {
    ArchiveEntry,
    ArchiveMerger,
    Constants,
    DataReaderEntrySource, ExtendedTimestamp,
    ReadArchive,
    WriteArchive
} from '../index.js';
import {expect, test} from '@jest/globals';
import {FakeDataIO, openFileReader, writeArchive, writeArchiveToBuffer} from './util.js';
import {BigInt, CRC32, ArrayBufferIO, NodeDeflateDataProcessor, NodeInflateDataProcessor} from "armarius-io";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const timestamp = 1655914036000;
const timestampSeconds = Math.floor(timestamp/1000);
const date = new Date(timestamp);

test('Write large file archive', async () => {
    expect(1).toBe(1);
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

    expect(archive.zip64).toBe(true);
    expect(entries.length).toBe(1);

    let entry = entries.pop();
    expect(entry.getFileNameString()).toBe(fileName);
    expect(entry.zip64ExtendedInformation).toBeTruthy();
    expect(entry.getUncompressedSize()).toBe(BigInt(size));
    expect(entry.getCrc()).toBe(126491095);
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

    expect(entries.length).toBe(1);

    let entry = entries.pop();
    expect(entry.getFileNameString()).toBe(fileName);
    expect(decoder.decode(await entry.getData())).toBe(payloadString);
    expect(entry.getCrc()).toBe(CRC32.hash(payload));
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

    expect(entries.length).toBe(1);
    expect(readArchive.isZip64).toBe(true);

    let entry = entries.pop();
    expect(entry.getFileNameString()).toBe(fileName);
    expect(entry.getFileCommentString()).toBe(fileComment);
    expect(entry.zip64ExtendedInformation).toBeTruthy();
    expect(entry.extendedTimestamp).toBeTruthy();
    expect(entry.unicodeFileComment).toBeTruthy();
    expect(entry.unicodeFileName).toBeTruthy();
    expect(entry.unicodeFileName?.crc32).toBe(entry.getFileNameCrc());
    expect(entry.unicodeFileComment?.crc32).toBe(entry.getFileCommentCrc());
    expect(entry.getLastModDate()).toEqual(date);

    let centralTimestampField = entry.extendedTimestamp;
    expect(centralTimestampField.modTime).toEqual(timestampSeconds);
    expect(centralTimestampField.acTime).toBeUndefined();
    expect(centralTimestampField.crTime).toBeUndefined();

    await entry.readLocalFileHeader();
    /** @type {ExtendedTimestamp} */
    let localTimestampField = entry.localFileHeader.getExtraField(Constants.EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP);
    expect(localTimestampField).toBeInstanceOf(ExtendedTimestamp);
    expect(localTimestampField.modTime).toEqual(timestampSeconds);
    expect(localTimestampField.acTime).toEqual(timestampSeconds);
    expect(localTimestampField.crTime).toEqual(timestampSeconds);
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

    expect(entries.find(e => e.fileNameString === 'file1.txt')).toBeInstanceOf(ArchiveEntry);
    expect(entries.find(e => e.fileNameString === 'file2.txt')).toBeInstanceOf(ArchiveEntry);
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
    expect((await entryIterator.next()).getFileNameString()).toBe('file-1.txt');

    let clone = await entryIterator.clone();
    expect((await entryIterator.next()).getFileNameString()).toBe((await clone.next()).getFileNameString());
});
