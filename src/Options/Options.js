
export default class Options {
    /**
     * @param {Object} options
     * @returns {this}
     */
    static from(options) {
        return Object.assign(new this(), options);
    }
}

