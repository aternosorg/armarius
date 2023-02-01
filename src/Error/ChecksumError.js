import ZipError from './ZipError.js';

export default class ChecksumError extends ZipError {
    /** @type {string} */ name = 'ChecksumError';
}