import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, resolve, WordService, fixture } from '../lib/game/engine.js';
import { HIGH_SCORES_KEY } from '../lib/game/high-scores.js';
import {
  SAVE_KEY,
  SAVE_VERSION,
  createPersistence,
  readSave,
  validGame,
} from '../lib/game/persistence.js';

function environment() {
  const values = new Map();
  let blocked = false,
    tail = Promise.resolve();
  const storage = {
    getItem: (key) => {
      if (blocked) throw Error('blocked');
      return values.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (blocked) throw Error('quota');
      values.set(key, value);
    },
  };
  const locks = {
    request: (_key, callback) => {
      const next = tail.then(callback);
      tail = next.catch(() => {});
      return next;
    },
  };
  const client = () =>
    createPersistence({
      storage: () => storage,
      locks,
      now: () => new Date(2026, 8, 8, 23, 59),
    });
  return {
    storage,
    values,
    client,
    block: (value) => {
      blocked = value;
    },
  };
}
const game = (id = 'run') => ({
  id,
  state: newGame(502),
  path: ['t22', 't23'],
  focusId: 't23',
});
const service = new WordService(['SOUP', 'TIN', 'SHY']);
const word = (state) =>
  resolve(state, { type: 'word', path: ['t22', 't23', 't24', 't25'] }, service)
    .state;

test('complete game and partial selection round-trip; continuation is deterministic', async () => {
  const env = environment(),
    client = env.client(),
    g = game();
  client.load();
  g.state.bonusTarget = 'BREAD';
  g.state.bonusAward = 3000;
  g.state.board[0].tier = 'gold';
  g.state.board[0].burnDamage = 1;
  await client.save(g);
  const reopened = env.client().load();
  assert.deepEqual(reopened.game, g);
  assert.deepEqual(word(reopened.game.state), word(g.state));
  assert.equal(reopened.revision, 1);
});

test('accepted result and score are saved together before any animation work', async () => {
  const env = environment(),
    client = env.client(),
    g = game();
  client.load();
  g.state = word(g.state);
  g.path = [];
  await client.save(g);
  const saved = readSave(env.storage);
  assert.equal(saved.game.state.turnNumber, 1);
  assert.equal(saved.game.state.score, 360);
  assert.equal(saved.scores[0].score, 360);
  assert.deepEqual(saved.game.state.board, g.state.board);
  assert.deepEqual(saved.game.path, []);
});

test('migration keeps original keys; improvements occupy only one leaderboard slot', async () => {
  const env = environment();
  const legacy = JSON.stringify(
    [100, 200, 300, 400, 500].map((score) => ({
      id: `old${score}`,
      score,
      date: '2026-09-01',
    })),
  );
  env.storage.setItem(HIGH_SCORES_KEY, legacy);
  const client = env.client();
  client.load();
  const g = game();
  for (const score of [150, 250, 350, 600, 700]) {
    g.state.score = score;
    await client.save(g);
    const saved = readSave(env.storage);
    assert.equal(saved.scores.length, 5);
    assert.equal(saved.scores.filter((s) => s.id === 'run').length, 1);
  }
  assert.equal(readSave(env.storage).scores[0].score, 700);
  assert.equal(env.storage.getItem(HIGH_SCORES_KEY), legacy);
  assert.equal(readSave(env.storage).scores[0].date, '2026-09-08');
});

test('new game replaces checkpoint while retaining earned score', async () => {
  const env = environment(),
    client = env.client(),
    g = game();
  client.load();
  g.state = word(g.state);
  await client.save(g);
  await client.save(game('fresh'));
  const saved = readSave(env.storage);
  assert.equal(saved.game.id, 'fresh');
  assert.equal(saved.game.state.score, 0);
  assert.equal(saved.scores[0].id, 'run');
});

test('fatal boards with removed tiles restore; scramble state restores', async () => {
  const env = environment(),
    client = env.client();
  client.load();
  const state = fixture();
  const path = service
    .findReachableWords(state.board)
    .find((w) => w.word === 'TIN').path;
  const fatal = resolve(state, { type: 'word', path }, service).state;
  assert.equal(fatal.status, 'game-over');
  assert.ok(fatal.board.length < 52);
  assert.ok(validGame(fatal));
  await client.save({ ...game(), state: fatal, path: [] });
  assert.deepEqual(readSave(env.storage).game.state, fatal);
  const stirred = resolve(
    newGame(502),
    { type: 'scramble' },
    new WordService(['SOUP', 'AAA', 'EEE', 'THE', 'AND', 'ATE', 'EAT', 'TEA']),
  );
  assert.equal(stirred.error, undefined);
  assert.ok(validGame(stirred.state));
});

test('damaged state retains scores; invalid selection and focus are repaired', async () => {
  const env = environment(),
    client = env.client(),
    g = game();
  client.load();
  g.state = word(g.state);
  g.path = [];
  await client.save(g);
  const saved = JSON.parse(env.storage.getItem(SAVE_KEY));
  saved.game.path = ['missing'];
  saved.game.focusId = 'missing';
  env.storage.setItem(SAVE_KEY, JSON.stringify(saved));
  assert.deepEqual(readSave(env.storage).game.path, []);
  for (const mutate of [
    (s) => {
      s.board[1].id = s.board[0].id;
    },
    (s) => {
      s.seed = -1;
    },
    (s) => {
      s.board.pop();
    },
    (s) => {
      s.board[0].tier = '__proto__';
    },
    (s) => {
      s.score = '360';
    },
    (s) => {
      s.board[0].column = 7;
    },
    (s) => {
      s.board[0].row = 100;
    },
  ]) {
    const broken = structuredClone(saved);
    mutate(broken.game.state);
    env.storage.setItem(SAVE_KEY, JSON.stringify(broken));
    const read = readSave(env.storage);
    assert.equal(read.game, null);
    assert.equal(read.damaged, true);
    assert.equal(read.scores[0].score, 360);
  }
});

test('unsupported save is never overwritten', async () => {
  const env = environment();
  const raw = JSON.stringify({ version: SAVE_VERSION + 1, futureData: 'keep' });
  env.storage.setItem(SAVE_KEY, raw);
  const client = env.client();
  assert.equal(client.load().unsupported, true);
  assert.equal((await client.save(game())).saved, false);
  assert.equal(env.storage.getItem(SAVE_KEY), raw);
});

test('storage failures preserve memory scores and recover on next change', async () => {
  const env = environment(),
    client = env.client(),
    g = game();
  client.load();
  env.block(true);
  g.state = word(g.state);
  const failed = await client.save(g);
  assert.equal(failed.saved, false);
  assert.equal(failed.scores[0].score, 360);
  env.block(false);
  assert.equal((await client.save(g)).saved, true);
  assert.equal(readSave(env.storage).game.state.score, 360);
});

test('simultaneous tabs and queued stale selections cannot overwrite newer progress', async () => {
  const env = environment(),
    a = env.client(),
    b = env.client();
  a.load();
  b.load();
  const first = game();
  first.state = word(first.state);
  const results = await Promise.all([
    a.save(first),
    b.save(game('stale')),
    b.save(game('queued-stale')),
  ]);
  assert.equal(results[0].saved, true);
  assert.equal(results[1].conflict, true);
  assert.equal(results[2].conflict, true);
  assert.equal(readSave(env.storage).game.id, 'run');
  const resumed = results[1].game;
  resumed.path = [];
  await b.save(resumed);
  assert.equal(readSave(env.storage).game.state.score, 360);
});

test('missing browser locks fails safely without writing', async () => {
  const env = environment();
  const client = createPersistence({ storage: () => env.storage });
  client.load();
  assert.equal((await client.save(game())).saved, false);
  assert.equal(env.storage.getItem(SAVE_KEY), null);
});
