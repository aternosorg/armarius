import {IO, NodeFileIO} from 'armarius-io';
import * as fs from 'fs';

export class FakeDataIO extends IO {
    fill;

    constructor(length, fill) {
        super();
        this.byteLength = length;
        this.fill = fill;
    }

    async clone(cloneOffset = 0, cloneLength) {
        return new this.constructor(cloneLength ?? this.byteLength - cloneOffset);
    }

    async readAt(offset, length, longLived) {
        if(offset + length > this.byteLength) {
            throw new Error('test');
        }
        let data = Buffer.alloc(length, this.fill);
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }

    isCloneable() {
        return true;
    }

    isReadable() {
        return true;
    }

    isSeekable() {
        return true;
    }

    isWritable() {
        return false;
    }

    async writeAt(offset, data) {
        return Promise.resolve(undefined);
    }
}

export async function writeArchive(path, archive) {
    let file = await fs.promises.open(path, 'w');
    let chunk = null;
    while ((chunk = await archive.getNextChunk()) !== null) {
        await file.write(Buffer.from(chunk));
    }
    await file.close();
}

export async function writeArchiveToBuffer(archive) {
    let chunks = [];
    let chunk = null;
    let i = 0;
    while ((chunk = await archive.getNextChunk(10*1024*1024)) !== null) {
        chunks.push(chunk);
        i++;
    }
    return Buffer.concat(chunks)
}

export async function openFileReader(path) {
    let file = await fs.promises.open(path, 'r');
    let stat = await file.stat();
    return new NodeFileIO(file, 0, stat.size);
}
