import NativeStreamDataProcessor from './NativeStreamDataProcessor.js';

export default class NativeInflateDataProcessor extends NativeStreamDataProcessor {
    /**
     * @inheritDoc
     */
    createProcessorStream() {
        return new DecompressionStream('deflate-raw');
    }
}
