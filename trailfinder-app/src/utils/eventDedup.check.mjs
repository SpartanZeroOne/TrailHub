// Self-check: node src/utils/eventDedup.check.mjs
import assert from 'node:assert/strict';
import { eventKey, dedupeEvents, findSimilarEventGroups } from './eventDedup.js';

const a = { id: 1, name: 'Tour Baie de Somme', start_date: '2027-10-16', organizer_id: 'forest', category: 'trips' };
const aCopy = { ...a, id: 2, name: '  tour BAIE de somme ' };
const otherOrg = { ...a, id: 3, organizer_id: 'other' };
const mx = { id: 4, name: 'Rocco', start_date: null, organizer_id: null, category: 'mx' };
const mxCopy = { ...mx, id: 5 };

assert.equal(eventKey(a), eventKey(aCopy), 'case/whitespace-insensitive');
assert.notEqual(eventKey(a), eventKey(otherOrg), 'per organizer');
assert.deepEqual(dedupeEvents([a, aCopy, otherOrg, mx, mxCopy]).map(e => e.id), [1, 3, 4], 'nulls not distinct');

const groups = findSimilarEventGroups([a, otherOrg, mx, mxCopy]);
assert.equal(groups.length, 1, 'undated events are not "similar"');
assert.deepEqual(groups[0].map(e => e.id), [1, 3]);

console.log('eventDedup: ok');
