import {afterEach, beforeEach, expect, test} from "@jest/globals";
import * as os from "node:os";
import fs from "node:fs";
import * as pathModule from "node:path";
import {pathToFileURL} from "node:url";
import {ArrayBufferIO, NodeFileHandle, NodeFileIO, symbols} from 'armarius-io';
import Packer from "../src/Util/Packer.js";
import TrackingFileHandle from "./util/TrackingFileHandle.js";
import TrackingContext from "./util/TrackingContext.js";
import ReadArchive from '../src/Archive/ReadArchive.js';

let tempDir;

beforeEach(async () => {
    tempDir = pathToFileURL(await fs.promises.mkdtemp(pathModule.join(os.tmpdir(), 'zip-test-')));
    await fs.promises.mkdir(new URL("fixtures/base/dir/empty_subdir/", import.meta.url), {recursive: true});
});

afterEach(async () => {
    await fs.promises.rm(tempDir, {recursive: true, force: true});
});

test("Pack directory", async () => {
    let dir = new NodeFileHandle(new URL("fixtures/base/", import.meta.url));

    {
        await using outputIO = await NodeFileIO.open(new URL("output1.zip", tempDir), 'w+');
        let packer = new Packer();
        await packer.pack(dir, outputIO);
    }


    await using archiveIO = await NodeFileIO.open(new URL("output1.zip", tempDir), 'r');
    let archive = new ReadArchive(archiveIO);
    await archive.init();

    let entries = await archive.getAllEntries();
    expect(entries.length).toBe(4);
    let names = entries.map(e => e.getFileNameString()).sort();
    expect(names).toEqual(['dir/', 'dir/empty_subdir/', 'dir/file2.txt', 'file.txt']);
});

test("Pack directory to ReadbaleStream", async () => {
    let dir = new NodeFileHandle(new URL("fixtures/base/", import.meta.url));
    let stream = await new Packer().packToStream(dir);

    let chunks = [];
    for await (let chunk of stream) {
        chunks.push(chunk);
    }

    let archiveData = Buffer.concat(chunks);
    await using io = new ArrayBufferIO(archiveData.buffer, archiveData.byteOffset, archiveData.byteLength);
    let archive = new ReadArchive(io);
    await archive.init();

    let entries = await archive.getAllEntries();
    expect(entries.length).toBe(4);
    let names = entries.map(e => e.getFileNameString()).sort();
    expect(names).toEqual(['dir/', 'dir/empty_subdir/', 'dir/file2.txt', 'file.txt']);
});

test("Dispose of all file handles and IO contexts", async () => {
    let tracking = new TrackingContext();
    let dir = new TrackingFileHandle(new NodeFileHandle(new URL("fixtures/base/", import.meta.url)), tracking);

    let outputFile = await fs.promises.open(new URL("output2.zip", tempDir), 'w+');
    let outputIO = new NodeFileIO(outputFile, 0, 0);

    let packer = new Packer();
    await packer.pack(dir, outputIO);
    await outputIO[symbols.asyncDispose]();
    await dir[symbols.asyncDispose]();

    expect(tracking.allHandles.size).toBe(0);
    expect(tracking.allIOs.size).toBe(0);
});

test("Dispose entry generators", async () => {
    let tracking = new TrackingContext();
    let dir = new TrackingFileHandle(new NodeFileHandle(new URL("fixtures/base/", import.meta.url)), tracking);

    let packer = new Packer();
    let generator = packer.generateEntries(dir);
    await generator.next();
    await generator.next();

    await generator[symbols.asyncDispose]();
    await dir[symbols.asyncDispose]();

    expect(tracking.allHandles.size).toBe(0);
    expect(tracking.allIOs.size).toBe(0);
});
