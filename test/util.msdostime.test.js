import {test} from 'node:test';
import assert from 'node:assert/strict';
import MsDosTime from '../src/Util/MsDosTime.js';

const timestamp = 1655914036349;
const roundedTimestamp = 1661184436000;
const date = new Date(timestamp);

let timeValue = 33000;
let dateValue = 21718;

test('Encode date value', () => {
    assert.strictEqual(MsDosTime.encodeDate(date), dateValue);
});

test('Encode time value', () => {
    assert.strictEqual(MsDosTime.encodeTime(date), timeValue);
});

test('Decode time and date value', () => {
    assert.strictEqual(MsDosTime.decode(dateValue, timeValue).getTime(), roundedTimestamp);
});

test('Clamp date to min', () => {
    assert.strictEqual(MsDosTime.clampDate(new Date(0)), MsDosTime.MIN);
});

test('Clamp date to max', () => {
    assert.strictEqual(MsDosTime.clampDate(new Date(2108, 11, 31)), MsDosTime.MAX);
});
