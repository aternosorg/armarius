import FallbackDataProcessor from './FallbackDataProcessor.js';
import NativeInflateDataProcessor from './NativeInflateDataProcessor.js';
import FflateInflateDataProcessor from './FflateInflateDataProcessor.js';

export default class DefaultInflateDataProcessor extends FallbackDataProcessor {
    /**
     * @inheritDoc
     */
    static getDataProcessors() {
        return [
            NativeInflateDataProcessor,
            FflateInflateDataProcessor
        ];
    }
}
