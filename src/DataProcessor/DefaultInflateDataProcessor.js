import FallbackDataProcessor from './FallbackDataProcessor.js';
import NativeInflateDataProcessor from './Native/NativeInflateDataProcessor.js';
import FflateInflateDataProcessor from './Fflate/FflateInflateDataProcessor.js';

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
