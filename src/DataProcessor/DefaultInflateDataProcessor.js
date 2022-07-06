import FallbackDataProcessor from './FallbackDataProcessor.js';
import NativeInflateDataProcessor from './NativeInflateDataProcessor.js';
import PakoInflateDataProcessor from './PakoInflateDataProcessor.js';

export default class DefaultInflateDataProcessor extends FallbackDataProcessor {
    /**
     * @inheritDoc
     */
    static getDataProcessors() {
        return [
            NativeInflateDataProcessor,
            PakoInflateDataProcessor
        ];
    }
}
