import AbstractDataProcessor from './AbstractDataProcessor.js';

export default class PassThroughDataProcessor extends AbstractDataProcessor {
    /** @type {boolean} */ eof = false;

    /**
     * @inheritDoc
     */
    async reset() {
        super.reset();
    }

    /**
     * @inheritDoc
     */
    async generate(length) {
        if(this.eof) {
            return null;
        }

        return await this.getChunkFromReader(length);
    }
}

