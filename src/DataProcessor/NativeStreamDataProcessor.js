import Constants from '../Constants.js';
import AbstractDataProcessor from './AbstractDataProcessor.js';

export default class NativeStreamDataProcessor extends AbstractDataProcessor {
    /** @type {ReadableStream} */ stream;
    /** @type {TransformStream} */ processor;
    /** @type {ReadableStreamDefaultReader} */ streamReader;

    /**
     * @inheritDoc
     */
    constructor(reader, createPreCrc = false, createPostCrc = false) {
        super(reader, createPreCrc, createPostCrc);
        this.reset();
    }

    /**
     * @inheritDoc
     */
    async generate(length) {
        let {value} = await this.streamReader.read();
        return value ?? null;
    }

    /**
     * @inheritDoc
     */
    reset() {
        super.reset();
        this.processor = this.createProcessorStream();
        this.stream = new ReadableStream({
            pull: async (controller) => {
                let data = await this.getChunkFromReader(Constants.DEFAULT_CHUNK_SIZE);
                controller.enqueue(data);
                if(this.eof) {
                    controller.close();
                }
            }
        });
        this.streamReader = this.stream.pipeThrough(this.processor).getReader();
    }

    /**
     * @return {TransformStream}
     * @abstract
     */
    createProcessorStream() {

    }
}