import AbstractDataProcessor from './AbstractDataProcessor.js';

export default class PassThroughDataProcessor extends AbstractDataProcessor {
    /**
     * @inheritDoc
     */
    async reset() {
        await super.reset();
    }

    /**
     * @inheritDoc
     */
    async generate(length) {
        if(this.chunkReader.isEof()) {
            return null;
        }

        return await this.chunkReader.getChunk(length);
    }
}

