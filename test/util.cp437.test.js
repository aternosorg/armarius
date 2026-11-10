import {test} from 'node:test';
import assert from 'node:assert/strict';
import CP437 from '../src/Util/CP437.js';

const validText = 'abcABC123!"§$%&/()=?,.-_:;#+*äöüÄÖÜß';
const invalidText = 'abcABC123!"§$%&/()=?,.-_:;#+*äöüÄÖÜß`´^°';

const validBytes = new Uint8Array([
        97, 98,  99,  65,  66,  67,  49,  50,  51,
        33, 34,  21,  36,  37,  38,  47,  40,  41,
        61, 63,  44,  46,  45,  95,  58,  59,  35,
        43, 42, 132, 148, 129, 142, 153, 154, 225
    ]);

test('CP437 encode valid string', () => {
    assert.deepStrictEqual(CP437.encode(validText), validBytes);
});

test('CP437 encode invalid string', () => {
    assert.throws(() => CP437.encode(invalidText));
});

test('CP437 decode valid array', () => {
    assert.strictEqual(CP437.decode(validBytes), validText);
});

test('CP437 decode invalid array', () => {
    // noinspection JSCheckFunctionSignatures
    assert.throws(() => CP437.decode([1, 2, 3, 4, 5, 257]));
});

test('CP437 can detect valid string', () => {
    assert.strictEqual(CP437.canBeEncoded(validText), true);
});

test('CP437 can detect invalid string', () => {
    assert.strictEqual(CP437.canBeEncoded(invalidText), false);
});
