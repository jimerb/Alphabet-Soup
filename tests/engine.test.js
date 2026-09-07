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
  BONUS_WORDS,
  bonusLength,
  rng,
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

test('fresh pots vary every non-hint slot and begin with only ordinary unburned tiles', () => {
  const starts = Array.from({ length: 50 }, (_, seed) => newGame(seed));
  for (const state of starts) {
    assert.equal(col(state, 3).slice(0, 4).map((t) => t.letter).join(''), 'SOUP');
    assert.ok(state.board.every((t) => t.tier === 'ordinary' && !t.isRed && !t.burnDamage));
    assert.equal(state.level, 1);
  }
  for (const tile of starts[0].board) {
    if (tile.column === 3 && tile.row < 4) continue;
    assert.ok(new Set(starts.map((s) => s.board.find((t) => t.id === tile.id).letter)).size > 1);
  }
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
test('selecting an earlier tile trims the entire suffix and allows a new continuation', () => {
  const s = newGame(3);
  const tiles = col(s, 3).slice(0, 7);
  tiles.forEach((t, i) => { t.letter = 'POIROTY'[i]; });
  const original = tiles.map((t) => t.id);
  const boardBefore = structuredClone(s.board);
  const trimmed = extendPath(s.board, original, original[2]);
  assert.deepEqual(trimmed, original.slice(0, 3));
  assert.equal(trimmed.map((id) => s.board.find((t) => t.id === id).letter).join(''), 'POI');
  assert.deepEqual(extendPath(s.board, original, original[0]), [original[0]]);
  assert.deepEqual(extendPath(s.board, original, original[6]), original.slice(0, -1));
  assert.deepEqual(extendPath(s.board, trimmed, original[6]), trimmed);
  const continued = extendPath(s.board, trimmed, original[3]);
  assert.deepEqual(continued, original.slice(0, 4));
  assert.deepEqual(original, tiles.map((t) => t.id));
  assert.deepEqual(s.board, boardBefore);
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

test('bonus vocabulary is valid and progression grows every two levels to seven', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7, 8, 20].map(bonusLength),
    [4, 4, 4, 5, 5, 6, 6, 7, 7],
  );
  for (const [length, words] of Object.entries(BONUS_WORDS))
    for (const word of words) {
      assert.equal(word.length, Number(length));
      assert.ok(dict.isValidWord(word), word);
    }
});

test('new targets are deterministic and never immediately playable across levels and seeds', () => {
  for (let seed = 0; seed < 30; seed++) {
    const s = newGame(seed);
    const reachable = new Set(
      dict.findReachableWords(s.board, 4, Infinity).map((w) => w.word),
    );
    for (const level of [2, 3, 4, 6, 8, 12]) {
      const word = dict.chooseBonusWord(s.board, 'SOUP', rng(seed), level);
      assert.ok(word);
      assert.equal(word.length, bonusLength(level));
      assert.equal(reachable.has(word), false, `${seed}: ${word}`);
      assert.notEqual(word, 'SOUP');
      assert.equal(
        word,
        dict.chooseBonusWord(s.board, 'SOUP', rng(seed), level),
      );
    }
  }
});

test('exact target search respects adjacency and cannot reuse tiles', () => {
  const s = newGame(4);
  assert.equal(dict.canFormWord(s.board, 'SOUP'), true);
  const board = [
    { id: 'a', letter: 'A', column: 0, row: 0 },
    { id: 'b', letter: 'B', column: 0, row: 1 },
    { id: 'c', letter: 'C', column: 0, row: 4 },
  ];
  assert.equal(dict.canFormWord(board, 'ABA'), false);
  assert.equal(dict.canFormWord(board, 'ABC'), false);
  const soupOnly = new WordService(['SOUP']);
  assert.equal(soupOnly.chooseBonusWord(s.board, null, rng(1), 2), null);
});

test('existing bonus survives level changes; completed target uses the new level', () => {
  const s = newGame(4);
  s.level = 3;
  s.score = 29990;
  s.bonusTarget = 'CAKE';
  const result = resolve(s, { type: 'word', path: soup(s) }, dict);
  assert.equal(result.state.level, 4);
  assert.equal(result.state.bonusTarget, 'CAKE');
  s.bonusTarget = 'SOUP';
  const completed = resolve(s, { type: 'word', path: soup(s) }, dict);
  assert.equal(completed.state.bonusTarget.length, 5);
  assert.equal(
    dict.canFormWord(completed.state.board, completed.state.bonusTarget),
    false,
  );
  assert.equal(completed.state.bonusAward, 2000);
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
