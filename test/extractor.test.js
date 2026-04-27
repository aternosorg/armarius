import {afterEach, beforeEach, expect, test} from "@jest/globals";
import * as os from "node:os";
import fs from "node:fs";
import * as pathModule from "node:path";
import {pathToFileURL} from "node:url";
import {NodeFileHandle, NodeFileIO, symbols} from "armarius-io";
import Extractor from "../src/Util/Extractor.js";
import TrackingFileHandle from "./util/TrackingFileHandle.js";
import TrackingContext from "./util/TrackingContext.js";
import ReadArchive from '../src/Archive/ReadArchive.js';


let tempDir;
let archivePath = new URL("fixtures/base.zip", import.meta.url);

beforeEach(async () => {
    tempDir = pathToFileURL(await fs.promises.mkdtemp(pathModule.join(os.tmpdir(), 'zip-test-')));
});

afterEach(async () => {
    await fs.promises.rm(tempDir, {recursive: true, force: true});
});

test("Extract archive", async () => {
    let archiveFile = await fs.promises.open(archivePath);
    let stat = await archiveFile.stat();
    await using io = new NodeFileIO(archiveFile, 0, stat.size);
    let archive = new ReadArchive(io);
    await archive.init();

    let extractor = new Extractor();

    await using output = new NodeFileHandle(tempDir);
    await extractor.extract(archive, output);

    let extractedFiles = await fs.promises.readdir(tempDir);
    expect(extractedFiles.sort()).toEqual(['dir', 'file.txt']);

    extractedFiles = await fs.promises.readdir(pathModule.join(tempDir.pathname, 'dir'));
    expect(extractedFiles.sort()).toEqual(['empty_subdir', 'file2.txt']);
});

test("Dispose of all file handles and IO contexts", async () => {
    let archiveFile = await fs.promises.open(archivePath);
    let stat = await archiveFile.stat();
    await using io = new NodeFileIO(archiveFile, 0, stat.size);
    let archive = new ReadArchive(io);
    await archive.init();

    let extractor = new Extractor();

    let tracking = new TrackingContext();
    let output = new TrackingFileHandle(new NodeFileHandle(tempDir), tracking);
    await extractor.extract(archive, output);
    await output[symbols.asyncDispose]();

    expect(tracking.allHandles.size).toBe(0);
    expect(tracking.allIOs.size).toBe(0);
});
