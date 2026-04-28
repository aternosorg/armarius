import Constants from '../Constants.js';

/**
 * A ReadableStream that reads data from a WriteArchive.
 */
export default class WriteArchiveStream extends ReadableStream {
    /**
     * @param {WriteArchive} archive
     * @param {function(): Promise<any>} dispose
     * @param {number} readSize
     */
    constructor(archive, dispose = null, readSize = Constants.DEFAULT_CHUNK_SIZE) {
        dispose ??= async () => {};
        super({
            async pull(controller) {
                try {
                    let chunk = await archive.getNextChunk(readSize);
                    if (chunk) {
                        controller.enqueue(chunk);
                    } else {
                        controller.close();
                        await dispose();
                    }
                } catch (e) {
                    controller.error(e);
                    await dispose();
                }
            },
            async cancel(reason) {
                await dispose();
            }
        });
    }
}
