import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HIGH_SCORES_KEY,
  localScoreDate,
  rankHighScores,
  readHighScores,
  formatScoreDate,
} from '../lib/game/high-scores.js';

const entry = (id, score, date = '2026-09-06') => ({ id, score, date });
const storage = (value) => ({ getItem: () => value });

test('empty and damaged browser storage recover safely', () => {
  for (const value of [null, '{bad json', '{}', 'null', '[null,5,"bad"]']) {
    assert.deepEqual(readHighScores(storage(value)), []);
  }
  assert.deepEqual(
    readHighScores({
      getItem() {
        throw Error('blocked');
      },
    }),
    [],
  );
});

test('only five highest games survive; same-game improvements replace their entry', () => {
  const scores = rankHighScores([
    entry('a', 100),
    entry('b', 900),
    entry('c', 700),
    entry('d', 200),
    entry('e', 400),
    entry('f', 800),
    entry('a', 1000),
    entry('a', 1000),
  ]);
  assert.deepEqual(
    scores.map(({ score }) => score),
    [1000, 900, 800, 700, 400],
  );
  assert.equal(scores.filter(({ id }) => id === 'a').length, 1);
});

test('separate games with equal scores remain separate; older achievement wins a tie', () => {
  assert.deepEqual(
    rankHighScores([entry('b', 500), entry('a', 500, '2026-09-05')]).map(
      ({ id }) => id,
    ),
    ['a', 'b'],
  );
});

test('old best counters and previously imported placeholders do not create a high score', () => {
  const oldStorage = {
    getItem: (key) => (key === 'alphabet-soup-best' ? '43440' : null),
  };
  assert.deepEqual(readHighScores(oldStorage), []);
  assert.deepEqual(
    readHighScores(
      storage(JSON.stringify([entry('legacy-best', 43440, null)])),
    ),
    [],
  );
  const earned = entry('played-game', 450);
  assert.deepEqual(
    readHighScores(
      storage(JSON.stringify([entry('legacy-best', 43440, null), earned])),
    ),
    [earned],
  );
  assert.notEqual(formatScoreDate(earned.date), 'Earlier game');
});
test('invalid scores and impossible dates never enter the leaderboard', () => {
  assert.deepEqual(
    rankHighScores([
      entry('zero', 0),
      entry('negative', -1),
      entry('nan', NaN),
      entry('fraction', 1.2),
      entry('string', '100'),
      entry('overflow', Number.MAX_SAFE_INTEGER + 1),
      entry('date', 100, '2026-02-30'),
      entry('unknown', 100, null),
      entry('valid', 42, '2024-02-29'),
    ]),
    [entry('valid', 42, '2024-02-29')],
  );
});

test('local dates use calendar fields, not UTC, and scores round-trip browser storage', () => {
  const now = new Date(2026, 8, 6, 23, 59);
  assert.equal(localScoreDate(now), '2026-09-06');
  const saved = new Map();
  const browser = {
    getItem: (key) => saved.get(key) || null,
    setItem: (key, value) => saved.set(key, value),
  };
  const scores = rankHighScores([entry('run', 450)]);
  browser.setItem(HIGH_SCORES_KEY, JSON.stringify(scores));
  assert.deepEqual(readHighScores(browser), scores);
});
