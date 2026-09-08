# Persistence verification - 2026-09-08

- 44 automated tests pass, including 10 new persistence tests: complete state/selection round trips, deterministic continuation, score/checkpoint atomicity, legacy migration, one entry per run, new games, fatal boards with gaps, scrambles, damaged data, unsupported versions, write failures/recovery, missing browser locks, and serialized competing tabs (including queued stale selections).
- Local browser: selected S then O, reloaded, and saw both selections restored on the identical board. Submitted SOUP and immediately reloaded during resolution; recovered score 360, turn 1, the completed refilled board, and an empty selection.
- Local browser: advanced a scramble in a second tab; the older tab restored turn 2 and declined its stale action. Canceling New Game kept turn 2 and 360 points; confirming New Game and reloading restored turn 0 while Best stayed 360.
- Production static build passes. Targeted lint on the new persistence module and tests passes; the existing game screen has pre-existing compiler, accessibility, and hook lint findings (confirmed against HEAD).
- No full browser-process shutdown or overnight wait was performed. Reload and second-tab tests verify saved-state restoration; browser data deletion and private-session policies still apply.

---

# Verification — 2026-09-05

## Rule tests

17 tests pass, including 100 simulated accepted turns across five seeds. Coverage includes all column capacities, reciprocal six-neighbor adjacency, no physical tile reuse, backtracking, scoring examples, stacked scoring rewards, free invalid attempts, downward gravity without bottom ejection, one-target burning, persistent Gold damage and third-hit destruction, rescue deadlines, clearing a bottom red, stacked-red simultaneous resolution, top-only new fire with no creation-turn burn, starting-level scoring, turn-costing scramble, failed scramble immutability, exact bonus completion, and actual/effective word length separation.

## Browser playtest

- Desktop composition checked at 1440 × 900 against the provided mockup: separate title, live brass-edged panels, 52 interactive ivory tiles in jagged columns, character, controls, kitchen background.
- Phone layout checked at 390 × 844: the board, current word, Submit, bonus, and danger panel fit together with only minimal page overflow.
- Clicked SOUP down the center. Preview and accepted score both 360; turn advanced once and the board refilled.
- Opened Settings, changed reduced-motion/high-contrast preferences, resumed, and checked score/turn unchanged and focus returned to Settings. Restored those testing overrides afterward.
- Invalid repeated/nonexistent tile IDs rejected without committing a move.
- Developer mockup fixture displayed all reward tiers, damaged Diamond, burning bottom S, urgent danger text, and disabled Scramble.
- Selected S → H → Y and pressed Enter. Score became 390, red disappeared, full board returned, and Scramble re-enabled.
- Scramble kept score 390, spent one turn, and created a top fire when pressure crossed threshold.
- New Game displayed confirmation; Keep playing preserved the run.
- Reloaded developer fixture and played TIN without rescuing S. Awarded 420 points including Gold, ended the run, disabled play, preserved final board for inspection, and showed restart.
- WebMCP read/submit tools were discovered and exercised through the supported browser context. Valid SOUP returned 360 points and a read-back of 52 tiles; invalid IDs returned an intentional error. Both use the same game controller as visible controls.

## Limits and defaults

This is an initial playable ruleset, not a claim that difficulty has been balanced for all players. The bundled dictionary includes unusual ordinary words. Settings and best score are device-local; active games restart on reload. Music is synthesized and muted by default. Character sprites are cropped from the supplied sheet, aligned on a fixed canvas, with independent blink overlays. The kitchen backdrop was generated from the reference with all interface elements removed. No source uploads were overwritten.
