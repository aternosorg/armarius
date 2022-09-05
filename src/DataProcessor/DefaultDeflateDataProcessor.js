import FallbackDataProcessor from './FallbackDataProcessor.js';
import NativeDeflateDataProcessor from './NativeDeflateDataProcessor.js';
import FflateDeflateDataProcessor from './FflateDeflateDataProcessor.js';

export default class DefaultDeflateDataProcessor extends FallbackDataProcessor {
    /**
     * @inheritDoc
     */
    static getDataProcessors() {
        return [
            NativeDeflateDataProcessor,
            FflateDeflateDataProcessor
        ];
    }
}
