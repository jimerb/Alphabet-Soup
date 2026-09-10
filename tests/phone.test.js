import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneMode, phoneLayout } from '../lib/game/phone-layout.js';
import { tilePointer } from '../lib/game/tile-pointer.js';

test('phone mode leaves desktops and full-size tablets on their existing layout', () => {
  assert.equal(phoneMode(390, 700, true), true);
  assert.equal(phoneMode(844, 390, true), true);
  for (const [w, h, touch] of [[390, 700, false], [1440, 900, true], [768, 1024, true], [1024, 768, true], [600, 960, true]]) {
    assert.equal(phoneMode(w, h, touch), false);
  }
});

test('phone geometry fits 52 staggered slots and controls without scaling targets', () => {
  for (const w of [360, 375, 390, 412, 430]) {
    for (const h of [500, 550, 700, 820]) {
      const layout = phoneLayout(w, h);
      assert.equal(layout.blocked, false);
      assert.equal(layout.scale, 1);
      assert.ok(layout.cellWidth >= 40 && layout.cellHeight >= 40);
      assert.ok(7 * layout.cellWidth + 6 <= w - 8);
      assert.ok(8 * (layout.cellHeight + 1) + 1 + 171 <= h);
    }
  }
  assert.equal(phoneLayout(844, 390).blocked, false);
  assert.equal(phoneLayout(800, 320).blocked, true);
  assert.equal(phoneLayout(320, 480).blocked, true);
});

const contact = (pointerId, extra = {}) => ({ pointerId, button: 0, isPrimary: true, ...extra });
test('one finger owns selection, duplicate moves and unrelated releases do not change it', () => {
  const gesture = tilePointer();
  assert.equal(gesture.begin(contact(1), 's'), true);
  assert.equal(gesture.begin(contact(2, { isPrimary: false }), 'x'), false);
  assert.equal(gesture.begin(contact(2), 'x'), false);
  assert.equal(gesture.move(contact(2), 'x'), false);
  assert.equal(gesture.move(contact(1), 's'), false);
  assert.equal(gesture.move(contact(1), null), false);
  assert.equal(gesture.move(contact(1), 'o'), true);
  gesture.end(contact(2));
  assert.equal(gesture.owns(contact(1)), true);
  assert.equal(gesture.move(contact(1), 's'), true, 'backtracking reaches the existing engine');
  gesture.end(contact(1));
  assert.equal(gesture.move(contact(1), 'u'), false);
  assert.equal(gesture.begin(contact(2), 'u'), true);
});

test('cancel, focus loss, and rotation release gesture ownership without changing a path', () => {
  const gesture = tilePointer();
  assert.equal(gesture.begin(contact(1, { button: 2 }), 's'), false);
  assert.equal(gesture.begin(contact(1), 's'), true);
  gesture.end();
  assert.equal(gesture.move(contact(1), 'o'), false);
  assert.equal(gesture.begin(contact(2), 'o'), true);
  gesture.end(contact(2));
  assert.equal(gesture.owns(contact(2)), false);
});
