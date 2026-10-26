// Self-check: node src/admin/hooks/useUrlState.check.mjs
import assert from 'node:assert/strict';
import { parseUrlState, buildUrlSearch } from './useUrlState.js';

const D = { category: '', page: 1, perPage: 25, sortDir: 'asc' };

assert.deepEqual(parseUrlState('', D), D);
assert.deepEqual(parseUrlState('?category=rallyes&page=2&perPage=50', D), { ...D, category: 'rallyes', page: 2, perPage: 50 });
assert.equal(parseUrlState('?page=abc', D).page, 1, 'bad number → default');
assert.equal(parseUrlState('?page=-3', D).page, 1, 'non-positive → default');

assert.equal(buildUrlSearch('', D, { ...D }), '', 'defaults omitted');
assert.equal(buildUrlSearch('', D, { ...D, category: 'rallyes', page: 2 }), '?category=rallyes&page=2');
assert.equal(buildUrlSearch('?category=rallyes&page=2', D, { ...D, page: 1 }), '', 'reset to default removes param');
assert.equal(buildUrlSearch('?organizer_name=X', D, { ...D, page: 3 }), '?organizer_name=X&page=3', 'unknown params kept');

console.log('useUrlState: ok');
