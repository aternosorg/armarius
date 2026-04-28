import EntrySourceOptions from '../Options/EntrySourceOptions.js';
import {Path, symbols} from 'armarius-io';
import WriteArchiveOptions from '../Options/WriteArchiveOptions.js';
import DirectoryEntrySource from '../Archive/EntrySource/DirectoryEntrySource.js';
import DataStreamEntrySource from '../Archive/EntrySource/DataStreamEntrySource.js';
import WriteArchive from '../Archive/WriteArchive.js';
import WriteArchiveStream from '../Archive/WriteArchiveStream.js';

export default class Packer {
    /** @type {EntrySourceOptions} */ entrySourceOptions;
    /** @type {WriteArchiveOptions} */ writeArchiveOptions;
    /** @type {?function(file: import("armarius-io").FileHandleInterface, stat: import("armarius-io").StatInterface, filename: string): Promise<boolean>} */ filter;

    /**
     * @param {WriteArchiveOptions|WriteArchiveOptionsObject} writeArchiveOptions
     * @param {EntrySourceOptions|EntrySourceOptionsObject} entrySourceOptions
     * @param {?function(file: import("armarius-io").FileHandleInterface, stat: import("armarius-io").StatInterface, filename: string): Promise<boolean>} filter
     */
    constructor(
        writeArchiveOptions = {},
        entrySourceOptions = {},
        filter = null
    ) {
        this.entrySourceOptions = EntrySourceOptions.from(entrySourceOptions);
        this.writeArchiveOptions = WriteArchiveOptions.from(writeArchiveOptions);
        this.filter = filter;
    }

    async *generateEntries(directory, basePath = '') {
        if (basePath.length) {
            yield new DirectoryEntrySource(Object.assign({}, this.entrySourceOptions, {
                fileName: basePath
            }));
        }
        for await (let child of directory.getChildren()) {
            try {
                let stat = await child.stat();
                let filename = Path.basename(child.getUrl().pathname)
                if (stat.isDirectory()) {
                    let path = `${basePath}${filename}/`;
                    if (this.filter && !await this.filter(child, stat, path)) {
                        continue;
                    }
                    yield* this.generateEntries(child, path);
                } else {
                    let path = `${basePath}${filename}`;
                    if (this.filter && !await this.filter(child, stat, path)) {
                        continue;
                    }
                    let io = await child.open(true, false);
                    try {
                        yield new DataStreamEntrySource(io, Object.assign({}, this.entrySourceOptions, {
                            fileName: path
                        }));
                    } finally {
                        await io[symbols.asyncDispose]();
                    }
                }
            } finally {
                await child[symbols.asyncDispose]();
            }
        }
    }

    /**
     * @param {import("armarius-io").FileHandleInterface} directory
     * @param {import("armarius-io").IO} output
     * @param {?AbortSignal} abortSignal
     * @returns {Promise<this>}
     */
    async pack(directory, output, abortSignal = null) {
        let generator = this.generateEntries(directory);
        let archive = new WriteArchive(generator, this.writeArchiveOptions);
        try {
            await archive.writeTo(output, abortSignal);
        } finally {
            await generator.return(null);
        }
        return this;
    }

    /**
     * @param {import("armarius-io").FileHandleInterface} directory
     * @returns {Promise<WriteArchiveStream>}
     */
    async packToStream(directory) {
        let generator = this.generateEntries(directory);
        let archive = new WriteArchive(generator, this.writeArchiveOptions);
        return new WriteArchiveStream(archive, async () => await generator.return(null));
    }
}
