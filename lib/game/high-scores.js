export const HIGH_SCORES_KEY = 'alphabet-soup-high-scores';

export function localScoreDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function validEntry(entry) {
  if (
    !entry ||
    typeof entry.id !== 'string' ||
    !entry.id ||
    entry.id === 'legacy-best' ||
    !Number.isSafeInteger(entry.score) ||
    entry.score <= 0
  )
    return false;
  if (typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date))
    return false;
  const date = new Date(`${entry.date}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localScoreDate(date) === entry.date;
}

// A growing score replaces this game's entry, rather than filling all five places.
export function rankHighScores(entries) {
  const games = new Map();
  for (const entry of entries.filter(validEntry)) {
    if (!games.has(entry.id) || entry.score > games.get(entry.id).score) {
      games.set(entry.id, {
        id: entry.id,
        score: entry.score,
        date: entry.date,
      });
    }
  }
  return [...games.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.date || '').localeCompare(b.date || '') ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 5);
}

export function readHighScores(storage) {
  let entries = [];
  try {
    const saved = JSON.parse(storage.getItem(HIGH_SCORES_KEY) || '[]');
    if (Array.isArray(saved)) entries = rankHighScores(saved);
  } catch {
    /* Storage may be blocked or contain an older malformed value. */
  }
  // Ignore the old best-score counter and previously imported placeholder.
  // Only actual dated game results belong in this leaderboard.
  return entries;
}

export function formatScoreDate(date) {
  return date
    ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Earlier game';
}
