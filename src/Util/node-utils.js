import {NodeFileHandle, NodeFileIO, symbols} from 'armarius-io';
import ReadArchive from '../Archive/ReadArchive.js';
import {pathToFileURL} from 'node:url';
import Extractor from './Extractor.js';
import Packer from './Packer.js';
import Verifier from './Verifier.js';

/**
 * @typedef {Object} ExtractOptions
 * @property {string} [archiveBasePath] - A base path to remove from the beginning of each entry's filename when extracting.
 * @property {ReadArchiveOptions|ReadArchiveOptionsObject} [archiveOptions] - Options to pass to the ReadArchive constructor when reading the archive.
 * @property {number} [maxConcurrentEntries] - The maximum number of entries to extract concurrently. Default is 10.
 * @property {AbortSignal} [abortSignal] - An AbortSignal to allow aborting the extraction process.
 * @property {?function(entry: ArchiveEntry, filename: string): Promise<boolean>} [filter] - An optional filter function for archive entries.
 */

/**
 * @param {import("node:fs").PathLike} path
 * @param {string|URL} target
 * @param {ExtractOptions} options
 * @returns {Promise<void>}
 */
export async function extract(path, target, options = {}) {
    if (typeof target === "string") {
        target = pathToFileURL(target);
    }
    let io = await NodeFileIO.open(path);
    let targetDirectory = new NodeFileHandle(target);
    let archive = new ReadArchive(io, options.archiveOptions ?? {});
    try {
        await archive.init();
        await new Extractor(options.filter ?? null, options.maxConcurrentEntries ?? 10)
            .extract(archive, targetDirectory, options.archiveBasePath ?? "", options.abortSignal ?? null);
    } finally {
        await io[symbols.asyncDispose]();
        await targetDirectory[symbols.asyncDispose]();
    }
}

/**
 * @typedef {Object} PackOptions
 * @property {WriteArchiveOptions|WriteArchiveOptionsObject} [archiveOptions] - Options to pass to the WriteArchive constructor when writing the archive.
 * @property {EntrySourceOptions|EntrySourceOptionsObject} [entrySourceOptions] - Options to pass to the EntrySource objects.
 * @property {AbortSignal} [abortSignal] - An AbortSignal to allow aborting the packing process.
 * @property {?function(file: import("armarius-io").FileHandleInterface, stat: import("armarius-io").StatInterface, filename: string): Promise<boolean>} [filter] - An optional filter function for files to include in the archive.
 * @property {string} [archiveBasePath] - A base path to prepend to the beginning of each entry's filename when packing.
 */

/**
 * @param {string|URL} source
 * @param {import("node:fs").PathLike} target
 * @param {PackOptions} options
 * @returns {Promise<void>}
 */
export async function pack(source, target, options = {}) {
    if (typeof source === "string") {
        source = pathToFileURL(source);
    }
    let io = await NodeFileIO.open(target, 'w');
    let sourceDirectory = new NodeFileHandle(source);
    try {
        await new Packer(options.archiveOptions ?? {}, options.entrySourceOptions ?? {}, options.filter ?? null)
            .pack(sourceDirectory, io, options.abortSignal ?? null, options.archiveBasePath ?? "");
    } finally {
        await io[symbols.asyncDispose]();
        await sourceDirectory[symbols.asyncDispose]();
    }
}

/**
 * @typedef {Object} VerifyOptions
 * @property {VerifyMode} [mode] - The level of verification to perform.
 * @property {?function(entry: ArchiveEntry): Promise<boolean>} [filter] - An optional filter function for archive entries to verify.
 * @property {number} [maxConcurrentEntries] - The maximum number of entries to verify concurrently. Default is 10.
 * @property {ReadArchiveOptions|ReadArchiveOptionsObject} [archiveOptions] - Options to pass to the ReadArchive constructor when reading the archive.
 * @property {AbortSignal} [abortSignal] - An AbortSignal to allow aborting the verification process.
 */

/**
 * @param {import("node:fs").PathLike} path
 * @param {VerifyOptions} options
 * @returns {Promise<void>}
 */
export async function verify(path, options = {}) {
    let io = await NodeFileIO.open(path);
    let archive = new ReadArchive(io, options.archiveOptions ?? {});
    try {
        await archive.init();
        await new Verifier(options.mode ?? "decompressed", options.filter ?? null, options.maxConcurrentEntries ?? 10)
            .verify(archive, options.abortSignal ?? null);
    } finally {
        await io[symbols.asyncDispose]();
    }
}
