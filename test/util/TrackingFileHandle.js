import {FileHandleInterface, symbols} from "armarius-io";

export default class TrackingFileHandle extends FileHandleInterface {
    /** @type {TrackingContext} */ context;
    /** @type {string} */ createStack;
    /** @type {FileHandleInterface} */ handle;

    constructor(handle, context) {
        super();
        this.handle = handle;
        this.createStack = new Error().stack;
        this.context = context;
        this.context.allHandles.add(this);
    }

    async open(readable, writable) {
        let io = await this.handle.open(readable, writable);
        this.context.allIOs.add(io);
        let dispose = io[symbols.asyncDispose].bind(io);
        io[symbols.asyncDispose] = async () => {
            await dispose();
            if (!this.context.allIOs.has(io)) {
                throw new Error("Already disposed");
            }
            this.context.allIOs.delete(io);
        }
        io.openStack = new Error().stack;
        return io;
    }

    async [symbols.asyncDispose]() {
        await this.handle[symbols.asyncDispose]();
        if (!this.context.allHandles.has(this)) {
            throw new Error("Already disposed");
        }
        this.context.allHandles.delete(this);
    }

    async *getChildren() {
        for await (let child of this.handle.getChildren()) {
            yield new TrackingFileHandle(child, this.context);
        }
    }

    async getChild(relativePath) {
        let child = await this.handle.getChild(relativePath);
        return new TrackingFileHandle(child, this.context);
    }

    async createChildDirectory(relativePath) {
        let child = await this.handle.createChildDirectory(relativePath);
        return new TrackingFileHandle(child, this.context);
    }

    async exists() {
        return await this.handle.exists();
    }

    async stat() {
        return await this.handle.stat();
    }

    getUrl() {
        return this.handle.getUrl();
    }
}
