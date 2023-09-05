import NodeStreamDataProcessor from './NodeStreamDataProcessor.js';
import {createDeflateRaw} from 'zlib';

export default class NodeDeflateDataProcessor extends NodeStreamDataProcessor {
    /**
     * @inheritDoc
     */
    initTransform() {
        this.transform = createDeflateRaw();
        this.transform.on('data', this.onData.bind(this));
    }
}
