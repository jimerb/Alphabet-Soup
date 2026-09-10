import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, resolve, WordService } from '../lib/game/engine.js';
import { tileFalls, phaseSound } from '../lib/game/feedback.js';
import { SoundKitchen } from '../lib/game/sound-kitchen.js';

const soupPath = (state) => state.board.filter((t) => t.column === 3 && t.row < 4)
  .sort((a, b) => a.row - b.row).map((t) => t.id);
const dictionary = new WordService(['SOUP']);

test('falls follow real gravity and refill; unmoved tiles stay still', () => {
  const state = newGame(42);
  state.board.find((t) => t.column === 0 && t.row === 0).isRed = true;
  const result = resolve(state, { type: 'word', path: soupPath(state) }, dictionary);
  let previous = state.board;
  for (const frame of result.frames) {
    const snapshot = structuredClone(previous);
    const falls = tileFalls(previous, frame.board);
    for (const tile of frame.board) {
      const old = previous.find((t) => t.id === tile.id);
      if (old && old.row === tile.row) assert.equal(falls[tile.id], undefined);
      else {
        assert.equal(falls[tile.id].rows, old ? old.row - tile.row : -(tile.row + 2));
        assert.ok(falls[tile.id].delay + 520 < 620, 'landing finishes before next phase');
      }
    }
    assert.deepEqual(previous, snapshot);
    previous = frame.board;
  }
});

test('bonus, actual fire damage, and fatal bottom fire each cue once', () => {
  const state = newGame(42);
  state.bonusTarget = 'SOUP';
  const red = state.board.find((t) => t.column === 0 && t.row === 0);
  red.isRed = true;
  const result = resolve(state, { type: 'word', path: soupPath(state) }, dictionary);
  assert.deepEqual(result.frames.map((frame) => phaseSound(frame, result)).filter(Boolean), ['bonus', 'singe']);
  red.isRed = false;
  state.board.find((t) => t.column === 0 && t.row === 6).isRed = true;
  const loss = resolve(state, { type: 'word', path: soupPath(state) }, dictionary);
  assert.equal(loss.state.status, 'game-over');
  assert.deepEqual(loss.frames.map((frame) => phaseSound(frame, loss)).filter(Boolean), ['bonus', 'loss']);
  const ordinary = newGame(42);
  const normal = resolve(ordinary, { type: 'word', path: soupPath(ordinary) }, dictionary);
  assert.deepEqual(normal.frames.map((frame) => phaseSound(frame, normal)).filter(Boolean), []);
});

function mockAudio(t) {
  const started = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: param(), Q: param(), start() { started.push(this); }, stop() {} });
  t.mock.method(globalThis, 'AudioContext', class {
    currentTime = 0;
    sampleRate = 48000;
    state = 'running';
    destination = {};
    createGain = node;
    createOscillator = node;
    createBufferSource = node;
    createBiquadFilter = node;
    createBuffer = (channels, length) => ({ getChannelData: () => new Float32Array(length) });
    close = () => {};
  });
  t.mock.method(globalThis, 'Audio', class {
    constructor(src) { this.src = src; }
    plays = 0;
    pauses = 0;
    currentTime = 0;
    play = () => { this.plays++; return Promise.resolve(); };
    pause = () => { this.pauses++; };
  });
  return started;
}
// Node has no browser audio globals; mock only this file's isolated test process.
globalThis.AudioContext = function () {};
globalThis.Audio = function () {};

test('level-up recording cues once at the level update, independently of a bonus prize', () => {
  const state = newGame(42);
  state.score = 9900;
  state.bonusTarget = 'SOUP';
  const result = resolve(state, { type: 'word', path: soupPath(state) }, dictionary);
  assert.deepEqual(result.frames.map((f) => phaseSound(f, result, state.level)).filter(Boolean), ['bonus', 'level-up']);
  const refill = result.frames.find((f) => f.phase === 'REFILL');
  assert.equal(refill.active.length, 4);
  assert.ok(refill.active.every((id) => !state.board.some((t) => t.id === id)));
});

test('new tile plops and level recording obey volume, mute, and cleanup', (t) => {
  const started = mockAudio(t);
  const kitchen = new SoundKitchen('/horn.m4a', '/assets/mmm-mm-good.wav');
  kitchen.setEffects(55, false);
  kitchen.start();
  kitchen.plop(0.03);
  kitchen.play('level-up');
  assert.equal(started.length, 1);
  assert.equal(kitchen.levelUp.src, '/assets/mmm-mm-good.wav');
  assert.equal(kitchen.levelUp.plays, 1);
  assert.equal(kitchen.levelUp.volume, 0.55);
  for (const [volume, mute] of [[55, true], [0, false]]) {
    kitchen.setEffects(volume, mute);
    kitchen.plop();
    kitchen.play('level-up');
    assert.equal(started.length, 1);
    assert.equal(kitchen.levelUp.plays, 1);
    assert.equal(kitchen.levelUp.currentTime, 0);
  }
  const recording = kitchen.levelUp;
  kitchen.close();
  assert.ok(recording.pauses > 0);
});

test('effects mute/zero suppress every cue; horn uses supplied asset and stops on mute/reset', (t) => {
  const started = mockAudio(t);
  const kitchen = new SoundKitchen('/Alphabet-Soup/assets/LosingHorn.m4a');
  kitchen.setEffects(55, true);
  kitchen.start();
  for (const kind of ['tile', 'bonus', 'singe', 'loss']) kitchen.play(kind);
  kitchen.scoreTick(0.5);
  assert.equal(started.length, 0);
  assert.equal(kitchen.horn.plays, 0);
  kitchen.setEffects(55, false);
  kitchen.play('bonus');
  assert.equal(started.length, 4);
  kitchen.play('singe');
  kitchen.scoreTick(0.5);
  assert.equal(started.length, 6);
  kitchen.play('loss');
  assert.equal(kitchen.horn.plays, 1);
  assert.equal(kitchen.horn.src, '/Alphabet-Soup/assets/LosingHorn.m4a');
  assert.equal(kitchen.effects.gain.value, 0.55);
  kitchen.setEffects(0, false);
  kitchen.play('loss');
  kitchen.play('bonus');
  assert.equal(started.length, 6);
  assert.equal(kitchen.horn.plays, 1);
  assert.equal(kitchen.horn.currentTime, 0);
  assert.ok(kitchen.horn.pauses > 0);
  kitchen.setEffects(55, false);
  kitchen.play('loss');
  kitchen.stopHorn();
  assert.equal(kitchen.horn.currentTime, 0);
  kitchen.setEffects(55, true);
  kitchen.note(261, 0.25, 0.8); // Music has its own volume control.
  assert.equal(started.length, 7);
  kitchen.close();
  assert.equal(kitchen.ctx, null);
});

test('a gesture resumes suspended and Safari-interrupted audio without replacing players or mute settings', async (t) => {
  const started = mockAudio(t);
  const kitchen = new SoundKitchen('/horn.m4a', '/level.wav', '/music.m4a');
  kitchen.setEffects(55, true);
  kitchen.start();
  const context = kitchen.ctx, horn = kitchen.horn, music = kitchen.music;
  let resumes = 0;
  context.resume = async () => { resumes++; context.state = 'running'; };
  for (const state of ['suspended', 'interrupted']) {
    context.state = state;
    kitchen.start();
    assert.equal(context.state, 'running');
    assert.equal(kitchen.ctx, context);
    assert.equal(kitchen.horn, horn);
    assert.equal(kitchen.music, music);
    kitchen.play('tile');
    assert.equal(started.length, 0);
  }
  assert.equal(resumes, 2);
  context.state = 'interrupted';
  context.resume = () => Promise.reject(new Error('User activation required'));
  kitchen.start();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(kitchen.ctx, context, 'a rejected resume is safe to retry on the next gesture');
  kitchen.close();
});
