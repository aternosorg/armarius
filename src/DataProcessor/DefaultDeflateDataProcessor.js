import FallbackDataProcessor from './FallbackDataProcessor.js';
import NativeDeflateDataProcessor from './NativeDeflateDataProcessor.js';
import PakoDeflateDataProcessor from './PakoDeflateDataProcessor.js';

export default class DefaultDeflateDataProcessor extends FallbackDataProcessor {
    /**
     * @inheritDoc
     */
    static getDataProcessors() {
        return [
            NativeDeflateDataProcessor,
            PakoDeflateDataProcessor
        ];
    }
}
