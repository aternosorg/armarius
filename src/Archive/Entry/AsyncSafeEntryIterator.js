import EntryIteratorInterface from './EntryIteratorInterface.js';

export default class AsyncSafeEntryIterator extends EntryIteratorInterface {
    /** @type {[string, function, function][]} */ queue = [];
    /** @type {boolean} */ working = false;
    /** @type {EntryIteratorInterface} */ baseIterator;

    /**
     * @param {EntryIteratorInterface} baseIterator
     */
    constructor(baseIterator) {
        super();
        this.baseIterator = baseIterator;
    }

    async work() {
        if (this.working) {
            return;
        }
        this.working = true;
        while (this.queue.length) {
            let [action, resolve, reject] = this.queue.shift();
            await this.processQueueEntry(action, resolve, reject);
        }
        this.working = false;
    }

    async processQueueEntry(action, resolve, reject) {
        let result;
        try {
            result = await this.baseIterator[action]();
        } catch (e) {
            reject(e);
            return;
        }
        resolve(result);
    }

    enqueue(action) {
        return new Promise((resolve, reject) => {
            this.queue.push([action, resolve, reject]);
            this.work();
        });
    }

    /**
     * @inheritDoc
     */
    async clone() {
        return new this.constructor(await this.enqueue("clone"));
    }

    /**
     * @inheritDoc
     */
    async next() {
        return await this.enqueue("next");
    }

    /**
     * @inheritDoc
     */
    reset() {
        if (this.working) {
            throw new Error("Cannot reset while working");
        }
        this.baseIterator.reset();
    }
}
