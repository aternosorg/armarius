import MsDosTime from '../src/Util/MsDosTime.js';

const timestamp = 1655914036349;
const roundedTimestamp = 1661184436000;
const date = new Date(timestamp);

let timeValue = 37096;
let dateValue = 21718;

test('Encode date value', () => {
    expect(MsDosTime.encodeDate(date)).toBe(dateValue);
});

test('Encode time value', () => {
    expect(MsDosTime.encodeTime(date)).toBe(timeValue);
});

test('Decode time and date value', () => {
    expect(MsDosTime.decode(dateValue, timeValue).getTime()).toBe(roundedTimestamp);
});

test('Clamp date to min', () => {
    expect(MsDosTime.clampDate(new Date(0))).toBe(MsDosTime.MIN);
});

test('Clamp date to max', () => {
    expect(MsDosTime.clampDate(new Date(2108, 11, 31))).toBe(MsDosTime.MAX);
});

