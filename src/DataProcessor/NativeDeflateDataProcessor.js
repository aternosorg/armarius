import NativeStreamDataProcessor from './NativeStreamDataProcessor.js';

export default class NativeDeflateDataProcessor extends NativeStreamDataProcessor {
    /**
     * @inheritDoc
     */
    createProcessorStream() {
        return new CompressionStream('deflate-raw');
    }
}
