import assert from 'node:assert/strict';
import { parseDbDate } from '../js/date-utils.js';

const expected = '2026-07-21T10:44:00.000Z';

assert.equal(parseDbDate('2026-07-21T10:44:00').toISOString(), expected);
assert.equal(parseDbDate('2026-07-21 10:44:00').toISOString(), expected);
assert.equal(parseDbDate('2026-07-21T10:44:00Z').toISOString(), expected);
assert.equal(parseDbDate('2026-07-21T12:44:00+02:00').toISOString(), expected);
assert.equal(parseDbDate(parseDbDate(expected)).toISOString(), expected);

console.log('date-utils: OK');
