// Offsets are in board rows so falling stays aligned at every screen size.
export function tileFalls(previous, next) {
  const before = new Map(previous.map((tile) => [tile.id, tile]));
  const falls = {};
  for (const tile of next) {
    const old = before.get(tile.id);
    const rows = old ? old.row - tile.row : -(tile.row + 2);
    if (rows < 0) falls[tile.id] = {
      rows,
      delay: tile.column * 9 + Math.max(0, 5 - tile.row) * 5,
      tilt: tile.column % 2 ? 5 : -5,
    };
  }
  return falls;
}

export function phaseSound(frame, result, previousLevel = result.state.level) {
  if (frame.phase === 'GAME_OVER') return 'loss';
  if (frame.phase === 'SCORE_AND_REMOVE' && result.bonus) return 'bonus';
  if (frame.phase === 'FIRE_DAMAGE' && frame.active.length) return 'singe';
  if (frame.phase === 'LEVEL_AND_BONUS_UPDATE' && result.state.level > previousLevel)
    return 'level-up';
  return null;
}
