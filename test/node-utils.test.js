import {afterEach, beforeEach, expect, test} from "@jest/globals";
import * as os from "node:os";
import fs from "node:fs";
import * as pathModule from "node:path";
import {pathToFileURL} from "node:url";
import {NodeFileIO} from "armarius-io";
import ReadArchive from '../src/Archive/ReadArchive.js';
import {extract, pack, verify} from '../src/Util/node-utils.js';


let tempDir;
let archivePath = new URL("fixtures/base.zip", import.meta.url);

beforeEach(async () => {
    tempDir = pathToFileURL(await fs.promises.mkdtemp(pathModule.join(os.tmpdir(), 'zip-test-')));
    await fs.promises.mkdir(new URL("fixtures/base/dir/empty_subdir/", import.meta.url), {recursive: true});
});

afterEach(async () => {
    await fs.promises.rm(tempDir, {recursive: true, force: true});
});

test("Extract archive", async () => {
    await extract(archivePath, tempDir);

    let extractedFiles = await fs.promises.readdir(tempDir);
    expect(extractedFiles.sort()).toEqual(['dir', 'file.txt']);

    extractedFiles = await fs.promises.readdir(pathModule.join(tempDir.pathname, 'dir'));
    expect(extractedFiles.sort()).toEqual(['empty_subdir', 'file2.txt']);
});

test("Pack files", async () => {
    await pack(new URL("fixtures/base/", import.meta.url), new URL("output.zip", tempDir));

    await using archiveIO = await NodeFileIO.open(new URL("output.zip", tempDir), 'r');
    let archive = new ReadArchive(archiveIO);
    await archive.init();

    let entries = await archive.getAllEntries();
    expect(entries.length).toBe(4);
    let names = entries.map(e => e.getFileNameString()).sort();
    expect(names).toEqual(['dir/', 'dir/empty_subdir/', 'dir/file2.txt', 'file.txt']);
});

test("Verify archive", async () => {
    await expect(verify(archivePath)).resolves.toBe(undefined);
});
