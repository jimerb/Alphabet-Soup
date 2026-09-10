import test from 'node:test';
import assert from 'node:assert/strict';
import { gameId } from '../lib/game/game-id.js';

test('secure origins retain native UUID generation', () => {
  assert.equal(gameId({ randomUUID: () => 'native-id' }), 'native-id');
});

test('LAN HTTP creates unique version 4 IDs without randomUUID', () => {
  const random = { getRandomValues: (bytes) => crypto.getRandomValues(bytes) };
  const ids = Array.from({ length: 100 }, () => gameId(random));
  for (const id of ids) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }
  assert.equal(new Set(ids).size, ids.length);
});
