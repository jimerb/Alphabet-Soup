import { BALANCE, CAPACITIES, TIERS, pathValid } from './engine.js';
import {
  localScoreDate,
  rankHighScores,
  readHighScores,
} from './high-scores.js';

export const SAVE_KEY = 'alphabet-soup-save';
export const SAVE_VERSION = 1;
const integer = (n, min = 0) => Number.isSafeInteger(n) && n >= min;

export function validGame(s) {
  if (
    !s ||
    !['playing', 'game-over'].includes(s.status) ||
    !['score', 'firePressure', 'turnNumber', 'nextId', 'seed'].every((k) =>
      integer(s[k]),
    ) ||
    s.seed > 0xffffffff ||
    s.level !== 1 + Math.floor(s.score / BALANCE.levelPoints) ||
    !integer(s.bonusAward, BALANCE.bonusStart) ||
    s.bonusAward > BALANCE.bonusCap ||
    !(
      s.bonusTarget === null ||
      (typeof s.bonusTarget === 'string' && /^[A-Z]{4,7}$/.test(s.bonusTarget))
    ) ||
    !Array.isArray(s.board) ||
    !s.board.length ||
    s.board.length > 52 ||
    !Array.isArray(s.responseDeadlines)
  )
    return false;
  const ids = new Set(),
    cells = new Set();
  for (const t of s.board) {
    if (
      !t ||
      typeof t.id !== 'string' ||
      !/^t\d+$/.test(t.id) ||
      !integer(Number(t.id.slice(1))) ||
      Number(t.id.slice(1)) >= s.nextId ||
      ids.has(t.id) ||
      typeof t.letter !== 'string' ||
      !/^[A-Z]$/.test(t.letter) ||
      !integer(t.column) ||
      t.column >= CAPACITIES.length ||
      !integer(t.row) ||
      t.row >= CAPACITIES[t.column] ||
      !Object.hasOwn(TIERS, t.tier) ||
      !integer(t.burnDamage) ||
      t.burnDamage >= TIERS[t.tier].hits ||
      typeof t.isRed !== 'boolean' ||
      !(t.bottomDeadline === null || integer(t.bottomDeadline, 1))
    )
      return false;
    const cell = `${t.column}:${t.row}`;
    if (cells.has(cell)) return false;
    cells.add(cell);
    ids.add(t.id);
  }
  // A fatal word is scored and removed before game-over, leaving legal gaps.
  if (s.status === 'playing' && s.board.length !== 52) return false;
  if (
    new Set(s.responseDeadlines).size !== s.responseDeadlines.length ||
    !s.responseDeadlines.every(
      (id) =>
        typeof id === 'string' &&
        (s.status === 'game-over' ||
          s.board.some(
            (t) =>
              t.id === id && t.isRed && t.bottomDeadline === s.turnNumber + 1,
          )),
    )
  )
    return false;
  return true;
}

export function readSave(storage) {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null)
    return { revision: 0, game: null, scores: readHighScores(storage) };
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    saved = null;
  }
  const scores = rankHighScores(
    Array.isArray(saved?.scores) ? saved.scores : readHighScores(storage),
  );
  if (saved?.version !== undefined && saved.version !== SAVE_VERSION)
    return { revision: 0, game: null, scores, unsupported: true };
  const metadataValid =
    saved?.version === SAVE_VERSION &&
    integer(saved.revision, 1) &&
    typeof saved.savedAt === 'string' &&
    Number.isFinite(Date.parse(saved.savedAt));
  const g = saved?.game;
  const gameValid =
    metadataValid &&
    typeof g?.id === 'string' &&
    g.id.length > 0 &&
    validGame(g.state);
  return {
    revision: integer(saved?.revision) ? saved.revision : 0,
    scores,
    damaged: !gameValid,
    game: gameValid
      ? {
          id: g.id,
          state: g.state,
          path:
            Array.isArray(g.path) && pathValid(g.state.board, g.path)
              ? g.path
              : [],
          focusId: g.state.board.some((t) => t.id === g.focusId)
            ? g.focusId
            : g.state.board[0].id,
        }
      : null,
  };
}

// Each client serializes its own writes; Web Locks serialize clients across tabs.
// Without Web Locks we keep playing in memory rather than risk overwriting a save.
export function createPersistence({ storage, locks, now = () => new Date() }) {
  let revision = 0,
    scores = [],
    queue = Promise.resolve(),
    generation = 0,
    conflict;
  function load() {
    const saved = readSave(storage());
    revision = saved.revision;
    scores = saved.scores;
    return saved;
  }
  function save(game) {
    const expectedGeneration = generation;
    const operation = async () => {
      if (expectedGeneration !== generation) return conflict;
      const improved = () =>
        rankHighScores([
          ...scores,
          {
            id: game.id,
            score: game.state.score,
            date: localScoreDate(now()),
          },
        ]);
      try {
        if (!locks?.request) throw Error('Browser locking unavailable');
        return await locks.request(SAVE_KEY, () => {
          const target = storage();
          const current = readSave(target);
          if (current.unsupported)
            return { ...current, saved: false, unsupported: true };
          if (current.revision !== revision) {
            revision = current.revision;
            scores = current.scores;
            generation++;
            conflict = { ...current, conflict: true, saved: true };
            return conflict;
          }
          scores = rankHighScores([...scores, ...current.scores]);
          scores = improved();
          const record = {
            version: SAVE_VERSION,
            revision: revision + 1,
            savedAt: now().toISOString(),
            game,
            scores,
          };
          target.setItem(SAVE_KEY, JSON.stringify(record));
          revision = record.revision;
          return { ...record, saved: true };
        });
      } catch {
        scores = improved();
        return { game, scores, saved: false };
      }
    };
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }
  return { load, save };
}
