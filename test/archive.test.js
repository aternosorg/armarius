import {
    ArrayBufferReader,
    Constants,
    DataReaderEntrySource, ExtendedTimestamp,
    ReadArchive,
    UnicodeExtraField,
    WriteArchive
} from '../index.js';
import {FakeDataReader, openFileReader, writeArchive, writeArchiveToBuffer} from './util.js';
import BigInt from '../src/Util/BigInt.js';

const encoder = new TextEncoder();
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
        return new DataReaderEntrySource(new FakeDataReader(size, 'a'), {
            fileName: fileName,
        });
    });
    let data = await writeArchiveToBuffer(archive);

    let readArchive = new ReadArchive(new ArrayBufferReader(data.buffer, data.byteOffset, data.byteLength));
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

test('Write many entries', async () => {
    let count = 70000;
    let i = 0;
    let archive = new WriteArchive(() => {
        if(i >= count) {
            return null;
        }
        i++;
        return new DataReaderEntrySource(new ArrayBufferReader(encoder.encode(`file-content-${i}`).buffer), {
            fileName: `file-${i}.txt`,
        });
    });

    let data = await writeArchiveToBuffer(archive);

    let readArchive = new ReadArchive(new ArrayBufferReader(data.buffer, data.byteOffset, data.byteLength));
    await readArchive.init();

    let readEntries = 0;
    await readArchive.forEachEntry((entry) => {
        readEntries++;
    });
    expect(readEntries).toBe(count);
    expect(readArchive.isZip64).toBe(true);
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
        return new DataReaderEntrySource(new ArrayBufferReader(encoder.encode(`file-content-${i}`).buffer), {
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

    let readArchive = new ReadArchive(new ArrayBufferReader(data.buffer, data.byteOffset, data.byteLength));
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
    expect(entry.getLastModDate()).toEqual(date);

    let centralTimestampField = entry.extendedTimestamp;
    expect(centralTimestampField.modTime).toEqual(timestampSeconds);
    expect(centralTimestampField.acTime).toBeUndefined();
    expect(centralTimestampField.crTime).toBeUndefined();

    await entry.readLocalFileHeader();
    let localTimestampField = entry.localFileHeader.getExtraField(Constants.EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP);
    expect(localTimestampField).toBeInstanceOf(ExtendedTimestamp);
    expect(localTimestampField.modTime).toEqual(timestampSeconds);
    expect(localTimestampField.acTime).toEqual(timestampSeconds);
    expect(localTimestampField.crTime).toEqual(timestampSeconds);
});
