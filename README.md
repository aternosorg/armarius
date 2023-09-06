# Armarius

## About

Armarius is a JavaScript library to read, write, and merge ZIP archives in web browsers.

This library mainly focuses on a low memory footprint, especially when reading archives with tens of thousands of
entries, and the ability to merge archives without decompressing and recompressing all entries.

For deflate/inflate support, this library depends on the [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API) (if available) or [fflate](https://github.com/101arrowz/fflate).

## Installation

Armarius can be installed using npm:

```shell
npm install armarius
```

It can then be loaded as an ES Module:

```javascript
import * as armarius from 'armarius';
```

You should also be able to bundle the library using [esbuild](https://github.com/evanw/esbuild)
or [webpack](https://webpack.js.org/).

## Usage

### Reading a ZIP archive

To read an archive, a [DataReader](src/Reader/DataReader.js) object is required. This library
provides [DataReader](src/Reader/DataReader.js) implementations for `File` and `ArrayBuffer`
objects. Other readers can be implemented by extending the [DataReader](src/Reader/DataReader.js) class.

```javascript
let fileInput = document.getElementById('file-input');
let reader = new armarius.BrowserFileReader(fileInput.files[0]);
```

A [ReadArchive](src/Archive/ReadArchive.js) can then be created from the reader.

```javascript
let archive = new armarius.ReadArchive(reader, options);
await archive.init();
```

The ReadArchive constructor optionally accepts an [ReadArchiveOptions](src/Options/ReadArchiveOptions.js) object with
the following properties:

| Name                         | Type                                        | Description                                                                                                                                                                  |
|------------------------------|---------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `centralDirectoryBufferSize` | number                                      | Buffer size used when reading central directory contents.<br/>Larger buffer sizes may improve performance, but also increase RAM usage.                                      |
| `createEntryIndex`           | boolean                                     | Whether an index of all central directory entries should be created the first time they are read.<br/>Massively increases performance when using `findEntry` multiple times. |
| `entryOptions`               | [EntryOptions](src/Options/EntryOptions.js) | Options passed to each created Entry object.                                                                                                                                 |

[EntryOptions](src/Options/EntryOptions.js) can have the following properties:

| Name              | Type                              | Description                                                                                       |
|-------------------|-----------------------------------|---------------------------------------------------------------------------------------------------|
| `dataProcessors`  | Map<number, typeof DataProcessor> | Map of compressionMethod => DataProcessor<br/>Can be used to implement custom compression methods |

#### Reading all archive entries

```javascript
let entries = await archive.getAllEntries();
```

Since this method will load all entries (not including their compressed data)
into memory, it is not recommended when working with large archives.

#### Iterating over archive entries

```javascript
let iterator = await archive.getEntryIterator();

let entry;
while (entry = await iterator.next()) {
    console.log(await entry.getFileNameString());
}
```

#### Finding specific entries

```javascript
let entry = await archive.findEntry('some/file.txt');
console.log(await entry.getFileNameString());
```

In most cases, this method is faster than iterating through all archive entries, since an internal index is used to find
files quickly.

### Reading entry data

#### Reading a full entry

```javascript
let entry = await archive.findEntry('example.txt');
let data = await entry.getData();

// Decode UTF-8
let decoder = new TextDecoder();
let text = decoder.decode(data);

console.log(text);
```

#### Reading entry data in chunks

```javascript
let entry = await archive.findEntry('example.txt');
let entryReader = await entry.getDataReader();

let chunk;
while (chunk = await reader.read(1024 * 64)) {
    console.log(chunk);
}
```

Note that the `length` parameter passed to `EntryDataReader.read` is the length of the compressed data read from the
file. Since this data is decompressed, the size of the returned chunk might differ.

Also note that an empty chunk returned from `EntryDataReader.read` does not necessarily indicate that all data has been read.
After all data was read, null will be returned instead.

### Writing archives

New archives can be created using a [WriteArchive](src/Archive/WriteArchive.js) object.
The [WriteArchive](src/Archive/WriteArchive.js) constructor needs to be passed a function, Generator or AsyncGenerator that generates
new [EntrySource](src/Archive/EntrySource/EntrySource.js) objects when needed.

Additionally, a [WriteArchiveOptions](src/Options/WriteArchiveOptions.js) object can be passed:

| Name           | Type    | Description                                                                                     |
|----------------|---------|-------------------------------------------------------------------------------------------------|
| `forceZIP64`   | boolean | Whether ZIP64 structures should always be created, even if not required by the archive content. |

```javascript
async function generateNextEntrySource() {
    //Create a new EntrySource or return null if no more entries should be added to the archive
    return null;
}

let writeArchive = new armarius.WriteArchive(generateNextEntrySource, options);
```

#### Generating entries

Whenever a new entry needs to be written to the archive, the `nextEntryFunction` will be called. It should return a new
Instance of [EntrySource](src/Archive/EntrySource/EntrySource.js), or `null` if no more entries should be added to the
archive.

This simple example will generate an archive that contains 10 text files:

```javascript
let encoder = new TextEncoder();
let i = 0;

function generateNextEntrySource() {
    if (i >= 10) {
        return null;
    }

    let fileName = `file-${i}`;
    let fileContent = encoder.encode(`Content of file ${i}`);

    let reader = new armarius.ArrayBufferReader(fileContent.buffer);
    let entry = new armarius.DataReaderEntrySource(reader, {fileName: fileName});
    i++;
    return entry;
}

let writeArchive = new armarius.WriteArchive(generateNextEntrySource);
```

Any [EntrySource](src/Archive/EntrySource/EntrySource.js) accepts an EntrySourceOptions object with the following
properties:

| Name                     | Type                              | Description                                                                                                                                                                                                                                                                                                                              |
|--------------------------|-----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `fileComment`            | string                            | Entry file comment                                                                                                                                                                                                                                                                                                                       |
| `fileName`               | string                            | Entry file name                                                                                                                                                                                                                                                                                                                          |
| `forceUTF8FileName`      | boolean                           | Always encode the filename and file comment in UTF-8, even if it could be encoded in CP437                                                                                                                                                                                                                                               |
| `compressionMethod`      | number                            | Compression method that should be used for this entry. By default, this library only supports `0` (Store) and `8` (Deflate). More compression methods can be added using the `dataProcessors` option.<br/><br/>When using an [ArchiveEntryEntrySource](src/Archive/EntrySource/ArchiveEntryEntrySource.js), this option will be ignored. |
| `forceZIP64`             | boolean                           | Whether ZIP64 structures should always be created, even if not required by the content.                                                                                                                                                                                                                                                  |
| `minMadeByVersion`       | number                            | The minimum `madeByVersion` value to be used for this entry. If a higher version is required (e.g. because ZIP64) is used, it will be set automatically and this option will be ignored.                                                                                                                                                 |
| `minExtractionVersion`   | number                            | The minimum `extractionVersion` value to be used for this entry. If a higher version is required (e.g. because ZIP64) is used, it will be set automatically and this option will be ignored.                                                                                                                                             |
| `modTime`                | Date                              | Last modified time of the entry                                                                                                                                                                                                                                                                                                          |
| `acTime`                 | Date                              | Last access time of the entry. This option is ignored if `extendedTimeStampField` is `false`.                                                                                                                                                                                                                                            |
| `crTime`                 | Date                              | File creation time of the entry. This option is ignored if `extendedTimeStampField` is `false`.                                                                                                                                                                                                                                          |
| `unicodeFileNameField`   | boolean                           | Whether a Unicode Path Extra Field should be added                                                                                                                                                                                                                                                                                       |
| `unicodeCommentField`    | boolean                           | Whether a Unicode Comment Extra Field should be added                                                                                                                                                                                                                                                                                    |
| `extendedTimeStampField` | boolean                           | Whether an Extended Timestamp Extra Field should be added                                                                                                                                                                                                                                                                                |
| `internalFileAttributes` | number                            | See https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT                                                                                                                                                                                                                                                                          |
| `externalFileAttributes` | number                            | See https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT                                                                                                                                                                                                                                                                          |
| `dataProcessors`         | Map<number, typeof DataProcessor> | Map of compressionMethod => DataProcessor<br/>Can be used to implement custom compression methods                                                                                                                                                                                                                                        |

#### Reading output chunks

The generated archive can be read using the `getNextChunk` function.

```javascript
let chunk;
while (chunk = await writeArchive.getNextChunk()) {
    console.log('New archive chunk:', chunk);
}
```

### Merging ZIP archives

Armarius supports merging ZIP archives without decompressing and recompressing individual entries.

```javascript
let archies = [myReadArchive1, myReadArchive2];

let merger = new armarius.ArchiveMerger(archives, options);
let outputWriteArchive = merger.getOutputArchive();

let chunk;
while (chunk = await outputWriteArchive.getNextChunk()) {
    console.log('New archive chunk:', chunk);
}
```

The [ArchiveMerger](src/Archive/Merge/ArchiveMerger.js) constructor accepts a list
of [ReadArchive](src/Archive/ReadArchive.js) or [MergeSource](src/Archive/Merge/MergeSource.js) objects and
a [MergeOptions](src/Archive/Merge/MergeSource.js) object with the following properties:

| Name                          | Type                                                      | Description                                                                                                                                                      |
|-------------------------------|-----------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `entrySourceOptions`          | [EntrySourceOptions](src/Options/EntrySourceOptions.js)   | Options passed to each created [EntrySource](src/Archive/EntrySource/EntrySource.js) object                                                                      |
| `writeArchiveOptions`         | [WriteArchiveOptions](src/Options/WriteArchiveOptions.js) | Options passed to the output WriteArchive                                                                                                                        |
| `nextPrependingEntryFunction` | Function                                                  | Function generating [EntrySource](src/Archive/EntrySource/EntrySource.js) objects that are added to the output archive before the contents of the input archives |

#### MergeSource objects

A [MergeSource](src/Archive/Merge/MergeSource.js) object allows greater control over how a source archive is merged into the
destination archive.

```javascript
let mergeSource = new armarius.MergeSource(readArchive);
mergeSource
    .setBasePath('base/path/within/the/source/archive')
    .setDestinationPath('path/within/the/destination/archive')
    .setFilter((entry) => {
        if (entry.getFileNameString().endsWith('.rar')) {
            return false; //Filter entry
        } else {
            return true; //Allow entry
        }
    });
```

### Node.js

While mainly intended for use in web browsers, this library can also be used in Node.js.

To read data from files, a [NodeFileReader](src/Reader/NodeFileReader.js) can be used:
```javascript
import * as fs from 'node:fs';

let file = await fs.promises.open('path/to/file.zip', 'r');
let stat = await file.stat();
let reader = new armarius.NodeFileReader(file, 0, stat.size);
```

While the default compression system works in Node.js since it falls back to [fflate](https://github.com/101arrowz/fflate), it is possible to explicitly use [zlib](https://nodejs.org/api/zlib.html) instead:
```javascript

const compressionDataProcessors = new Map([
    [armarius.Constants.COMPRESSION_METHOD_DEFLATE, armarius.NodeDeflateDataProcessor],
    [armarius.Constants.COMPRESSION_METHOD_STORE, armarius.PassThroughDataProcessor]
]);

let entrySource = new armarius.DataReaderEntrySource(reader, {
    fileName: 'file.txt',
    compressionMethod: armarius.Constants.COMPRESSION_METHOD_DEFLATE,
    dataProcessors: compressionDataProcessors
});
```

```javascript

const decompressionDataProcessors = new Map([
    [armarius.Constants.COMPRESSION_METHOD_DEFLATE, armarius.NodeInflateDataProcessor],
    [armarius.Constants.COMPRESSION_METHOD_STORE, armarius.PassThroughDataProcessor]
]);

let archive = new armarius.ReadArchive(reader, {
    entryOptions: {
        dataProcessors: decompressionDataProcessors
    }
});
```

## License

Armarius is open source software released under the MIT license, see [license](LICENSE).

### Contributing

You can contribute to this project by [forking](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo)
the repository, adding your changes to your fork, and creating
a [pull request](https://github.com/aternosorg/armarius/compare).
