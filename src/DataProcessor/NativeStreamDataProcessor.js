import Constants from '../Constants.js';
import AbstractDataProcessor from './AbstractDataProcessor.js';

export default class NativeStreamDataProcessor extends AbstractDataProcessor {
    /** @type {?boolean} */ static supported = null;
    /** @type {?ReadableStream} */ stream = null;
    /** @type {?TransformStream} */ processor = null;
    /** @type {?ReadableStreamDefaultReader} */ streamReader = null;

    /**
     * @return {boolean}
     */
    static isSupported() {
        if (this.supported === null) {
            if (typeof navigator !== 'undefined' && navigator.userAgent &&
                /^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
                this.supported = false;
                return this.supported;
            }

            try {
                // noinspection JSUnresolvedFunction
                new CompressionStream('deflate-raw');
            } catch (e) {
                this.supported = false;
                return this.supported;
            }
            this.supported = true;
        }

        return this.supported;
    }

    /**
     * @inheritDoc
     */
    constructor(reader, createPreCrc = false, createPostCrc = false) {
        super(reader, createPreCrc, createPostCrc);
    }

    /**
     * @inheritDoc
     */
    async generate(length) {
        if(this.streamReader === null) {
            this.resetStreams();
        }
        let {value} = await this.streamReader.read();
        return value ?? null;
    }

    /**
     * @inheritDoc
     */
    resetStreams() {
        let chunkReader = this.chunkReader;
        this.processor = this.createProcessorStream();
        this.stream = new ReadableStream({
            pull: async (controller) => {
                let data = await chunkReader.getChunk(Constants.DEFAULT_CHUNK_SIZE);
                controller.enqueue(data);
                if(this.chunkReader.isEof()) {
                    controller.close();
                }
            }
        });
        this.streamReader = this.stream.pipeThrough(this.processor).getReader();
    }

    /**
     * @inheritDoc
     */
    async reset() {
        await super.reset();
        this.processor = null;
        this.stream = null;
        this.streamReader = null;
    }

    /**
     * @return {TransformStream}
     * @abstract
     */
    createProcessorStream() {

    }
}
