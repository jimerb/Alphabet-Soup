import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  newGame,
  CAPACITIES,
  TIERS,
  neighbors,
  adjacent,
  extendPath,
  scoreWord,
  WordService,
  resolve,
  settle,
  fixture,
} from '../lib/game/engine.js';
const dict = new WordService(
  readFileSync(new URL('../public/words.txt', import.meta.url), 'utf8').split(
    /\r?\n/,
  ),
);
const tile = (s, c, r) => s.board.find((t) => t.column === c && t.row === r);
const col = (s, c) =>
  s.board.filter((t) => t.column === c).sort((a, b) => a.row - b.row);
const soup = (s) =>
  col(s, 3)
    .slice(0, 4)
    .map((t) => t.id);
const sizes = (s) => CAPACITIES.map((_, c) => col(s, c).length);
test('52 permanent slots and deterministic random boards', () => {
  const s = newGame(4);
  assert.deepEqual(s, newGame(4));
  assert.deepEqual(sizes(s), CAPACITIES);
  assert.equal(s.board.length, 52);
});
test('staggered geometry is reciprocal and never square diagonals', () => {
  const s = newGame(4);
  assert.equal(neighbors(s.board, tile(s, 2, 3).id).length, 6);
  assert.equal(neighbors(s.board, tile(s, 1, 0).id).length, 3);
  for (const a of s.board)
    for (const b of s.board) assert.equal(adjacent(a, b), adjacent(b, a));
  assert.equal(adjacent(tile(s, 0, 0), tile(s, 1, 2)), false);
});
test('selection prevents reuse and nonadjacent jumps; backtrack removes last', () => {
  const s = newGame(3),
    a = tile(s, 3, 0).id,
    b = tile(s, 3, 1).id;
  assert.deepEqual(extendPath(s.board, [a, b], a), [a]);
  assert.deepEqual(extendPath(s.board, [a], tile(s, 0, 6).id), [a]);
});
test('published scoring examples and stacked rewards', () => {
  const ts = (w) => [...w].map((letter) => ({ letter, tier: 'ordinary' }));
  assert.equal(scoreWord(ts('SEA'), 1), 120);
  assert.equal(scoreWord(ts('JIB'), 1), 420);
  assert.equal(scoreWord(ts('FAINT'), 1), 600);
  let t = ts('FAINT');
  t[0].tier = 'green';
  t[1].tier = 'gold';
  assert.equal(scoreWord(t, 1), 1320);
});
test('invalid input never changes state', () => {
  const s = newGame(4),
    before = structuredClone(s);
  assert.ok(
    resolve(s, { type: 'word', path: soup(s).slice(0, 2) }, dict).error,
  );
  assert.deepEqual(s, before);
});
test('word removal, gravity, refill preserve bottom and order', () => {
  const s = newGame(4),
    bottom = tile(s, 3, 7).id,
    survivors = col(s, 3)
      .slice(4)
      .map((t) => t.id);
  const r = resolve(s, { type: 'word', path: soup(s) }, dict);
  assert.deepEqual(sizes(r.state), CAPACITIES);
  assert.equal(tile(r.state, 3, 7).id, bottom);
  assert.deepEqual(
    col(r.state, 3)
      .slice(4)
      .map((t) => t.id),
    survivors,
  );
});
test('red consumes just one tile and occupies its vacancy', () => {
  const s = newGame(8),
    r = tile(s, 0, 1),
    target = tile(s, 0, 2),
    bottom = tile(s, 0, 6);
  r.isRed = true;
  const result = resolve(s, { type: 'word', path: soup(s) }, dict).state;
  assert.equal(result.board.find((t) => t.id === r.id).row, 2);
  assert.equal(
    result.board.some((t) => t.id === target.id),
    false,
  );
  assert.equal(tile(result, 0, 6).id, bottom.id);
});
test('gold survives two hits and damage persists through movement', () => {
  const s = newGame(8);
  tile(s, 0, 0).isRed = true;
  const gold = tile(s, 0, 1);
  gold.tier = 'gold';
  let current = s;
  for (let hit = 1; hit <= 3; hit++) {
    current = resolve(current, { type: 'scramble' }, dict).state;
    const target = current.board.find((t) => t.id === gold.id);
    if (hit < 3) assert.equal(target.burnDamage, hit);
    else assert.equal(target, undefined);
  }
});
test('new bottom red has response turn, invalid is free, surviving next move loses after scoring', () => {
  const s = newGame(8),
    red = tile(s, 0, 5);
  red.isRed = true;
  let r = resolve(s, { type: 'word', path: soup(s) }, dict);
  assert.equal(r.state.status, 'playing');
  assert.equal(r.state.board.find((t) => t.id === red.id).bottomDeadline, 2);
  assert.ok(resolve(r.state, { type: 'scramble' }, dict).error);
  let path = dict
    .findReachableWords(r.state.board, 3)
    .find((w) => !w.path.includes(red.id)).path;
  const oldScore = r.state.score;
  r = resolve(r.state, { type: 'word', path }, dict);
  assert.equal(r.state.status, 'game-over');
  assert.ok(r.state.score > oldScore);
});
test('using bottom red rescues it', () => {
  const s = newGame(7);
  for (let i = 4; i < 7; i++) tile(s, 0, i).letter = 'SEA'[i - 4];
  tile(s, 0, 6).isRed = true;
  const r = resolve(
    s,
    {
      type: 'word',
      path: col(s, 0)
        .slice(4)
        .map((t) => t.id),
    },
    dict,
  );
  assert.equal(r.state.status, 'playing');
  assert.equal(
    r.state.board.some((t) => t.id === tile(s, 0, 6).id),
    false,
  );
});
test('stacked reds use same pre-fire snapshot', () => {
  const s = newGame(8),
    upper = tile(s, 0, 1),
    lower = tile(s, 0, 2);
  upper.isRed = lower.isRed = true;
  const target = tile(s, 0, 3).id;
  const r = resolve(s, { type: 'word', path: soup(s) }, dict).state;
  assert.equal(r.board.find((t) => t.id === upper.id).row, 2);
  assert.equal(r.board.find((t) => t.id === lower.id).row, 3);
  assert.equal(
    r.board.some((t) => t.id === target),
    false,
  );
  assert.equal(r.board.filter((t) => t.burnDamage).length, 0);
});
test('new fire waits, spawns only at top, level uses starting level', () => {
  const s = newGame(7);
  s.firePressure = 3;
  s.score = 9990;
  const r = resolve(s, { type: 'word', path: soup(s) }, dict);
  assert.equal(r.points, 360);
  assert.equal(r.state.level, 2);
  assert.equal(r.state.board.filter((t) => t.isRed).length, 1);
  assert.ok(r.state.board.find((t) => t.isRed).row < 2);
  assert.equal(r.state.board.filter((t) => t.burnDamage).length, 0);
  assert.ok(dict.isValidWord(r.state.bonusTarget));
});
test('scramble preserves red letter before fire and tiers/damage', () => {
  const s = newGame(7),
    red = tile(s, 0, 0),
    reward = tile(s, 0, 1);
  red.isRed = true;
  reward.tier = 'diamond';
  reward.burnDamage = 1;
  const r = resolve(s, { type: 'scramble' }, dict);
  const f = r.frames[0];
  assert.equal(f.board.find((t) => t.id === red.id).letter, red.letter);
  assert.equal(f.board.find((t) => t.id === red.id).row, red.row);
  assert.equal(r.state.board.find((t) => t.id === reward.id).burnDamage, 2);
  assert.equal(r.state.score, 0);
  assert.equal(r.state.turnNumber, 1);
  assert.equal(r.state.firePressure, 3);
});
test('failed scramble leaves turn and pressure unchanged', () => {
  const s = newGame(3);
  assert.ok(resolve(s, { type: 'scramble' }, new WordService([])).error);
  assert.equal(s.turnNumber, 0);
});
test('bonus exact match independent of score and capped award', () => {
  const s = newGame(2);
  s.level = 2;
  s.bonusTarget = 'SOUP';
  s.bonusAward = 10000;
  const r = resolve(s, { type: 'word', path: soup(s) }, dict);
  assert.equal(r.points, 10400);
  assert.equal(r.state.bonusAward, 10000);
  assert.notEqual(r.state.bonusTarget, 'SOUP');
});
test('actual length determines promotion; reward bonus affects only points', () => {
  const s = newGame(4);
  tile(s, 3, 0).tier = 'diamond';
  const r = resolve(s, { type: 'word', path: soup(s) }, dict);
  assert.equal(r.actual, 4);
  assert.equal(
    r.frames.some((f) => f.phase === 'REWARD_PROMOTION'),
    false,
  );
});
test('100 seeded simulated moves preserve board invariants', () => {
  let count = 0;
  for (let seed = 0; seed < 5; seed++) {
    let s = newGame(seed);
    for (let i = 0; i < 20 && s.status === 'playing'; i++) {
      const words = dict.findReachableWords(s.board, 3);
      const deadlines = s.responseDeadlines;
      const choice = words
        .filter((w) => deadlines.every((id) => w.path.includes(id)))
        .sort((a, b) => b.word.length - a.word.length)[0];
      if (!choice) break;
      s = resolve(s, { type: 'word', path: choice.path }, dict).state;
      if (s.status === 'playing') {
        assert.deepEqual(sizes(s), CAPACITIES);
        assert.equal(new Set(s.board.map((t) => t.id)).size, 52);
      }
      count++;
    }
  }
  assert.ok(count >= 40);
  console.log('Simulated valid turns:', count);
});
