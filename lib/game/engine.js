export const CAPACITIES = [7, 8, 7, 8, 7, 8, 7];
export const TIERS = {
  ordinary: { bonus: 0, hits: 1, symbol: '' },
  green: { bonus: 2, hits: 2, symbol: '♧' },
  gold: { bonus: 4, hits: 3, symbol: '★' },
  sapphire: { bonus: 7, hits: 4, symbol: '◆' },
  diamond: { bonus: 10, hits: 5, symbol: '◇' },
};
export const BALANCE = {
  minimumLength: 3,
  levelPoints: 10000,
  bonusStart: 1000,
  bonusStep: 1000,
  bonusCap: 10000,
  scramblePressure: 3,
  scrambleRetries: 40,
  letters:
    'AAAAAAAAAABBBCCCDDDDEEEEEEEEEEEEEFFGGGHHIIIIIIIIJKLLLLLMMMNNNNNNOOOOOOOOPPPQRRRRRRSSSSSSSTTTTTTTUUUUUUVVWWXYYZ',
};
export const VALUES = Object.fromEntries(
  ['AEIOS', 'LNRTU', 'DG', 'BCMP', 'FHV', 'WY', 'KQ', 'JX', '', 'Z'].flatMap(
    (s, i) => [...s].map((l) => [l, i + 1]),
  ),
);
// Familiar targets keep the challenge in arranging tiles, not obscure vocabulary.
export const BONUS_WORDS = {
  4: 'BAKE BEAN BOWL CAKE CORN DISH FORK HERB LIME MEAL MILK MINT PEAR PLUM RICE SALT SOUP STEW TART TUNA'.split(
    ' ',
  ),
  5: 'APPLE BREAD CANDY CREAM FEAST FLOUR GRAPE HONEY JUICE LEMON MANGO OLIVE ONION PASTA PEACH PLATE SALAD SPICE SPOON TOAST'.split(
    ' ',
  ),
  6: 'ALMOND BANANA BUTTER CARROT CASHEW CHEESE CHERRY COFFEE COOKIE DINNER GINGER MUFFIN NOODLE ORANGE PEPPER PICKLE POTATO RADISH TOMATO WALNUT'.split(
    ' ',
  ),
  7: 'APRICOT AVOCADO BISCUIT BROWNIE CABBAGE COCONUT COOKING CRACKER CUPCAKE CUSTARD KITCHEN LETTUCE PANCAKE PARSLEY POPCORN PUMPKIN SAUSAGE SPINACH VANILLA VINEGAR'.split(
    ' ',
  ),
};
export function bonusLength(level) {
  return Math.min(7, 4 + Math.floor(Math.max(0, level - 2) / 2));
}
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function yOf(t) {
  return t.row + (t.column % 2 === 0 ? 0.5 : 0);
}
export function adjacent(a, b) {
  return (
    a.id !== b.id &&
    ((a.column === b.column && Math.abs(a.row - b.row) === 1) ||
      (Math.abs(a.column - b.column) === 1 &&
        Math.abs(yOf(a) - yOf(b)) === 0.5))
  );
}
export function neighbors(board, id) {
  const t = board.find((t) => t.id === id);
  return t ? board.filter((b) => adjacent(t, b)) : [];
}
export function pathValid(board, path) {
  const tiles = path.map((id) => board.find((t) => t.id === id));
  return (
    tiles.every(Boolean) &&
    new Set(path).size === path.length &&
    tiles.every((t, i) => !i || adjacent(tiles[i - 1], t))
  );
}
export function extendPath(board, path, id) {
  if (path.at(-1) === id) return path.slice(0, -1);
  const selectedIndex = path.indexOf(id);
  if (selectedIndex >= 0) return path.slice(0, selectedIndex + 1);
  return !path.length || neighbors(board, path.at(-1)).some((t) => t.id === id)
    ? [...path, id]
    : path;
}
export function scoreWord(tiles, level) {
  return (
    10 *
    (tiles.length + tiles.reduce((s, t) => s + TIERS[t.tier].bonus, 0)) *
    (tiles.reduce((s, t) => s + VALUES[t.letter], 0) + level)
  );
}
export class WordService {
  constructor(words) {
    this.words = new Set(
      words
        .filter((w) => /^[a-zA-Z]{3,52}$/.test(w))
        .map((w) => w.toUpperCase()),
    );
    this.root = {};
    for (const word of this.words) {
      let n = this.root;
      for (const c of word) n = n[c] ??= {};
      n.end = word;
    }
  }
  isValidWord(word) {
    return this.words.has(word.toUpperCase());
  }
  findReachableWords(board, minimumLength = 3, limit = 2000) {
    const found = new Map();
    const adj = new Map(board.map((t) => [t.id, neighbors(board, t.id)]));
    const visit = (tile, node, path, used) => {
      node = node[tile.letter];
      if (!node) return;
      path = [...path, tile.id];
      if (node.end && path.length >= minimumLength && !found.has(node.end))
        found.set(node.end, path);
      if (found.size >= limit) return;
      used.add(tile.id);
      for (const next of adj.get(tile.id))
        if (!used.has(next.id)) visit(next, node, path, used);
      used.delete(tile.id);
    };
    for (const t of board) {
      visit(t, this.root, [], new Set());
      if (found.size >= limit) break;
    }
    return [...found].map(([word, path]) => ({ word, path }));
  }
  findRescueWord(board, required) {
    let found = null;
    const adj = new Map(board.map((t) => [t.id, neighbors(board, t.id)]));
    const visit = (tile, node, path, used) => {
      if (found) return;
      node = node[tile.letter];
      if (!node) return;
      path = [...path, tile.id];
      if (node.end && required.every((id) => path.includes(id))) {
        found = { word: node.end, path };
        return;
      }
      used.add(tile.id);
      for (const next of adj.get(tile.id))
        if (!used.has(next.id)) visit(next, node, path, used);
      used.delete(tile.id);
    };
    for (const t of board) {
      visit(t, this.root, [], new Set());
      if (found) break;
    }
    return found;
  }
  canFormWord(board, word) {
    const adj = new Map(board.map((t) => [t.id, neighbors(board, t.id)]));
    const used = new Set();
    const visit = (tile, index) => {
      if (tile.letter !== word[index]) return false;
      if (index === word.length - 1) return true;
      used.add(tile.id);
      const found = adj
        .get(tile.id)
        .some((next) => !used.has(next.id) && visit(next, index + 1));
      used.delete(tile.id);
      return found;
    };
    return board.some((tile) => visit(tile, 0));
  }
  chooseBonusWord(board, exclude, random, level = 2) {
    const candidates = BONUS_WORDS[bonusLength(level)].filter(
      (word) => word !== exclude && this.isValidWord(word),
    );
    const start = Math.floor(random() * candidates.length);
    for (let i = 0; i < candidates.length; i++) {
      const word = candidates[(start + i) % candidates.length];
      if (!this.canFormWord(board, word)) return word;
    }
    return null;
  }
}
const copy = (s) => structuredClone(s);
export function newGame(seed = Date.now()) {
  const random = rng(seed);
  let nextId = 0;
  const board = CAPACITIES.flatMap((n, column) =>
    Array.from({ length: n }, (_, row) => ({
      id: `t${nextId++}`,
      letter: BALANCE.letters[Math.floor(random() * BALANCE.letters.length)],
      column,
      row,
      tier: 'ordinary',
      burnDamage: 0,
      isRed: false,
      bottomDeadline: null,
    })),
  ); // Only the friendly first word is fixed; every other letter is random.
  for (let i = 0; i < 4; i++)
    board.find((t) => t.column === 3 && t.row === i).letter = 'SOUP'[i];
  return {
    board,
    score: 0,
    level: 1,
    firePressure: 0,
    bonusTarget: null,
    bonusAward: BALANCE.bonusStart,
    turnNumber: 0,
    status: 'playing',
    responseDeadlines: [],
    nextId,
    seed: seed >>> 0,
  };
}
export function fixture() {
  const s = newGame(421);
  const letters = [
    'VCYMGPD',
    'AHUTSWOL',
    'BRINXEJ',
    'ULQTKFZD',
    'QMEOPGC',
    'ZWIBAVYH',
    'XRUJNTS',
  ];
  s.board.forEach((t) => (t.letter = letters[t.column][t.row]));
  for (const [c, r, tier] of [
    [1, 2, 'green'],
    [1, 3, 'gold'],
    [3, 1, 'gold'],
    [3, 5, 'sapphire'],
    [4, 2, 'diamond'],
    [5, 2, 'green'],
    [5, 5, 'gold'],
  ])
    s.board.find((t) => t.column === c && t.row === r).tier = tier;
  s.board.find((t) => t.column === 4 && t.row === 2).burnDamage = 1;
  const red = s.board.find((t) => t.column === 6 && t.row === 6);
  red.isRed = true;
  red.bottomDeadline = 1;
  s.responseDeadlines = [red.id];
  return s;
}
export function danger(board) {
  const reds = board.filter((t) => t.isRed);
  const bottom = reds.filter((t) => t.row === CAPACITIES[t.column] - 1);
  return {
    count: reds.length,
    bottom,
    amount: reds.length
      ? Math.max(...reds.map((t) => (t.row + 1) / CAPACITIES[t.column]))
      : 0,
  };
}
export function settle(board) {
  for (let c = 0; c < 7; c++) {
    const col = board
      .filter((t) => t.column === c)
      .sort((a, b) => a.row - b.row);
    col.forEach((t, i) => (t.row = CAPACITIES[c] - col.length + i));
  }
  return board;
}
function refill(state, random) {
  const fresh = [];
  for (let c = 0; c < CAPACITIES.length; c++) {
    const missing = CAPACITIES[c] - state.board.filter((t) => t.column === c).length;
    for (let row = 0; row < missing; row++) {
      const tile = {
        id: `t${state.nextId++}`,
        letter: BALANCE.letters[Math.floor(random() * BALANCE.letters.length)],
        column: c, row, tier: 'ordinary', burnDamage: 0,
        isRed: false, bottomDeadline: null,
      };
      state.board.push(tile);
      fresh.push(tile.id);
    }
  }
  return fresh;
}
// Older saves ended immediately after removal and can contain holes.
export function settleSavedGameOver(state) {
  if (state.status !== 'game-over' || state.board.length === 52) return state;
  const settled = copy(state);
  settle(settled.board);
  refill(settled, rng(settled.seed + settled.turnNumber * 104729 + 997));
  return settled;
}
export function resolve(state, action, service) {
  if (state.status !== 'playing') return { error: 'This run has ended.' };
  const s = copy(state),
    random = rng(s.seed + s.turnNumber * 104729 + 997);
  const frames = [];
  const frame = (phase, active = []) =>
    frames.push({ phase, board: copy(s.board), active });
  const startReds = s.board.filter((t) => t.isRed).map((t) => t.id);
  const bottomIds = danger(s.board).bottom.map((t) => t.id);
  let actual = 0,
    word = '',
    points = 0,
    bonus = false;
  if (action.type === 'word') {
    const path = action.path ?? [];
    if (!pathValid(s.board, path))
      return { error: 'Connect neighboring tiles without reusing a letter.' };
    const tiles = path.map((id) => s.board.find((t) => t.id === id));
    word = tiles.map((t) => t.letter).join('');
    actual = tiles.length;
    if (actual < 3) return { error: 'Use at least three letters.' };
    if (!service.isValidWord(word))
      return { error: `“${word}” is not in our dictionary.` };
    points = scoreWord(tiles, s.level);
    bonus = word === s.bonusTarget;
    if (bonus) points += s.bonusAward;
    s.score += points;
    frame('SCORE_AND_REMOVE', path);
    s.board = s.board.filter((t) => !path.includes(t.id));
  } else if (action.type === 'scramble') {
    if (bottomIds.length)
      return {
        error:
          'Clear the bottom burning tile with a word. Scramble cannot rescue it.',
      };
    const movable = s.board.filter((t) => !t.isRed);
    const letters = movable.map((t) => t.letter);
    let playable = false;
    for (let k = 0; k < BALANCE.scrambleRetries; k++) {
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      movable.forEach((t, i) => (t.letter = letters[i]));
      if (service.findReachableWords(s.board, 3, 1).length) {
        playable = true;
        break;
      }
    }
    if (!playable)
      return {
        error: 'No playable scramble found. Your board and turn are unchanged.',
      };
    frame('SCRAMBLE');
  } else return { error: 'Unknown action.' };
  s.turnNumber++;
  if (bottomIds.some((id) => s.board.some((t) => t.id === id))) {
    s.status = 'game-over';
    s.level = 1 + Math.floor(s.score / BALANCE.levelPoints);
    // Finish the accepted word's visual resolution before announcing the loss.
    // The fatal fire remains; no further fire damage or rewards are applied.
    settle(s.board);
    frame('GRAVITY');
    frame('REFILL', refill(s, random));
    frame('GAME_OVER');
    return { state: s, frames, word, points, actual, bonus };
  }
  settle(s.board);
  frame('GRAVITY');
  const targets = new Map();
  for (const red of s.board.filter((t) => startReds.includes(t.id))) {
    const target = s.board.find(
      (t) => t.column === red.column && t.row === red.row + 1,
    );
    if (target && !target.isRed)
      targets.set(target.id, (targets.get(target.id) ?? 0) + 1);
  }
  const destroyed = [];
  for (const [id, hits] of targets) {
    const tile = s.board.find((t) => t.id === id);
    tile.burnDamage += hits;
    if (tile.burnDamage >= TIERS[tile.tier].hits) destroyed.push(id);
  }
  frame('FIRE_DAMAGE', [...targets.keys()]);
  s.board = s.board.filter((t) => !destroyed.includes(t.id));
  settle(s.board);
  frame('FIRE_GRAVITY');
  const fresh = refill(s, random);
  frame('REFILL', fresh);
  const tier =
    actual >= 8
      ? 'diamond'
      : actual === 7
        ? 'sapphire'
        : actual === 6
          ? 'gold'
          : actual === 5
            ? 'green'
            : null;
  if (tier) {
    const candidates = s.board.filter((t) => t.tier === 'ordinary' && !t.isRed);
    if (candidates.length) {
      const chosen = candidates[Math.floor(random() * candidates.length)];
      chosen.tier = tier;
      frame('REWARD_PROMOTION', [chosen.id]);
    }
  }
  s.firePressure = Math.max(
    0,
    s.firePressure +
      (action.type === 'scramble'
        ? BALANCE.scramblePressure
        : actual === 3
          ? 2
          : actual === 4
            ? 1
            : -1),
  );
  const threshold = s.level < 5 ? 4 : s.level < 10 ? 3 : 2;
  if (s.firePressure >= threshold) {
    const candidates = s.board.filter(
      (t) => t.row < 2 && t.tier === 'ordinary' && !t.isRed,
    );
    if (candidates.length) {
      const chosen = candidates[Math.floor(random() * candidates.length)];
      chosen.isRed = true;
      s.firePressure -= threshold;
      frame('FIRE_CREATION', [chosen.id]);
    }
  }
  s.responseDeadlines = [];
  s.board.forEach((t) => {
    if (t.isRed && t.row === CAPACITIES[t.column] - 1) {
      t.bottomDeadline = s.turnNumber + 1;
      s.responseDeadlines.push(t.id);
    }
  });
  s.level = 1 + Math.floor(s.score / BALANCE.levelPoints);
  if (bonus) {
    s.bonusTarget = null;
    s.bonusAward = Math.min(BALANCE.bonusCap, s.bonusAward + BALANCE.bonusStep);
  }
  if (s.level >= 2 && !s.bonusTarget)
    s.bonusTarget = service.chooseBonusWord(
      s.board,
      bonus ? word : null,
      random,
      s.level,
    );
  frame('LEVEL_AND_BONUS_UPDATE');
  return { state: s, frames, word, points, actual, bonus };
}
