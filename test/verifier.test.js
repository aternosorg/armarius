import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {ArrayBufferIO, NodeFileIO} from "armarius-io";
import Verifier from "../src/Util/Verifier.js";
import ReadArchive from '../src/Archive/ReadArchive.js';

let archivePath = new URL("fixtures/base.zip", import.meta.url);

test("Verify archive", async () => {
    await using io = await NodeFileIO.open(archivePath);
    let archive = new ReadArchive(io);
    await archive.init();

    let verifier = new Verifier();
    assert.strictEqual(await verifier.verify(archive), verifier);
});

test("Throw on archive error", async () => {
    let archiveData = await fs.promises.readFile(archivePath);
    archiveData.set([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], 0x32);

    await using io = new ArrayBufferIO(archiveData.buffer, archiveData.byteOffset, archiveData.byteLength);
    let archive = new ReadArchive(io);
    await archive.init();

    let verifier = new Verifier();

    await assert.rejects(verifier.verify(archive));
});

test("Ignore data error in header mode", async () => {
    let archiveData = await fs.promises.readFile(archivePath);
    archiveData.set([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], 0x32);

    await using io = new ArrayBufferIO(archiveData.buffer, archiveData.byteOffset, archiveData.byteLength);
    let archive = new ReadArchive(io);
    await archive.init();

    let verifier = new Verifier("header");

    assert.strictEqual(await verifier.verify(archive), verifier);
});
