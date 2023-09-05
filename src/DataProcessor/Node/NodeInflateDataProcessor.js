import NodeStreamDataProcessor from './NodeStreamDataProcessor.js';
import {createInflateRaw} from 'zlib';


export default class NodeInflateDataProcessor extends NodeStreamDataProcessor {
    /**
     * @inheritDoc
     */
    initTransform() {
        this.transform = createInflateRaw();
        this.transform.on('data', this.onData.bind(this));
    }
}
