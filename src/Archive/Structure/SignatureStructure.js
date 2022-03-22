import Structure from "./Structure.js";

/**
 * @abstract
 */
export default class SignatureStructure extends Structure {
    /** @type {number} */ signature;

    /**
     * @param {number} signature
     */
    setSignature(signature) {
        let correctSignature = this.constructor.getSignature();
        if (signature !== correctSignature) {
            throw new Error(`Invalid signature for ${this.constructor.name}. Expected 0x${correctSignature.toString(16)}, got 0x${signature.toString(16)}`);
        }
        this.signature = signature;
    }

    /**
     * @returns {number}
     * @abstract
     */
    static getSignature() {

    }
}

