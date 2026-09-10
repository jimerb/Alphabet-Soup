# Phone compatibility verification - 2026-09-10

## LAN preview follow-up

- More-sheet clipping fix: replaced transform-based centering with explicit safe-area side insets and auto margins, disabled menu position/zoom animations, and prevented buttons from shrinking in scrollable content. Browser checks at 360x500, 390x550, 430x820, and 844x390 confirm horizontal centering, at least 8px viewport margins, 44px buttons, reachable Resume, and successful closing. Physical Safari confirmation remains pending. This follow-up is local until approved for publishing.

- Phone feedback follow-up: save notices now occupy a fixed 14px row beneath the play buttons. The current word explicitly reads `✓ Valid word · 360 points` for SOUP, independently of save status. More explains the HTTP preview limitation and that first-time visits are not the cause. Desktop notices and save protections are preserved.
- Rechecked all 20 phone viewport combinations with a live save warning: all 52 tiles and the notice fit without page scrolling, with a 40px minimum tile height. Clear, partial-word feedback, valid-word feedback, More/resume, rotation, and SOUP submission passed with no page errors; selection feedback did not move the board. Desktop excluded the new notice row. All 51 automated tests pass.

- `pnpm dev` now binds all network interfaces on port 3000 using Vinext's `--hostname` option. Verified HTTP 200 at http://192.168.1.103:3000/ and server hostname `0.0.0.0`; localhost remains usable. The preview is left running for physical-phone testing on the same network.
- LAN HTTP lacks `crypto.randomUUID`, so game IDs now fall back to cryptographic random bytes with the same UUID v4 format. Native UUID generation remains unchanged on secure origins. Two focused tests bring the suite to 51 passing tests; targeted lint and whitespace checks pass.
- Chromium touch emulation at the LAN URL loaded all 52 tiles, submitted SOUP for 360 points, opened More, confirmed New Game, and returned to score zero without page errors or page scrolling. This verifies LAN-origin play from this machine, not a physical phone's connection or sound output.
- LAN HTTP also lacks Web Locks. Existing safe memory-only play and its visible save warning remain intact; refreshing this preview can lose the run. HTTPS save behavior and the save format are unchanged.
- Production export completed cleanly with exit code 0 in the final terminal run. Two preceding runs completed export but encountered the existing intermittent Windows libuv shutdown assertion.
- No commit, push, deployment, firewall change, or additional listening port was made.

## Phone layout checks

- 49 automated tests pass: the prior 44 plus phone size boundaries, desktop/tablet exclusion, single-pointer ownership, gesture cancellation, and Safari-interrupted audio recovery. No rule, dictionary, save-schema, dependency, or hosting changes.
- Production build completed with exit code 0 using the existing Vinext build command. Some earlier Windows runs hit a native libuv shutdown assertion after completing the export; the final run completed cleanly outside the sandbox. The exported game was also exercised through a local static server.
- Production Chrome touch emulation: all 20 combinations of widths 360/375/390/412/430 and heights 500/550/700/820 show all 52 tiles, current word, and controls without page scrolling. Smallest measured tile was approximately 49.42 x 40.375px at 360 x 500; action controls are 44px tall. Layout changes now reposition tiles immediately, without the previous top-position transition briefly pushing them offscreen.
- A 23-letter selection at 360px fit completely (341.7px text within a 352px container, approximately 17.6px font). Selection and score feedback did not move the board. Simulated 47px top and 34px bottom safe-area padding kept essential content inside the usable viewport.
- Real touch events through Chromium's input protocol formed SOUP by dragging; taps backtracked to SO and extended to SOU. Cancellation released ownership. Portrait/landscape changes preserved selection, and rotating during submission completed at 360 points with 52 tiles. Insufficient landscape height displayed the portrait prompt and retained the run.
- More paused interaction and preserved the word. Settings, Help, Top Of The Pot, restart cancellation, and closing/resuming returned to the same game and visible control. Mute effects, reduced motion, and high contrast toggles persisted across reload. The sound tests cover interruption recovery, mute, effects, and retained players; they do not prove audible output on a physical phone.
- Invalid submission spent no turn; SOUP scored 360. The development fixture rescued bottom fire with SHY for 390 points; Scramble stayed disabled until rescue, then retained the score. TIN without rescue ended the fixture at 420, preserved its final tiles, and confirmed New Game successfully reset it. A normal saved run restored the identical board and SO selection after reload in an isolated browser profile.
- Compared against the unchanged HEAD in an isolated temporary copy: stage, board, word, score-panel, Submit, and Scramble rectangles matched exactly at 1440x900, 1024x768, 768x1024, and 600x960. Desktop mouse dragging and arrow/Space/Enter/Escape controls passed. Screenshots and the production size matrix are retained under ignored `work/phone-qa/`; the temporary source copy was removed.
- Targeted lint found the same 13 pre-existing screen findings as unchanged HEAD and no new findings in the added modules/tests. Whitespace checks pass.
- Remaining release checks: physical iPhone Safari and Chrome, physical Android Chrome, actual iPad Safari/Chrome, audible music/effects after app switching or screen locking, and genuine browser toolbar/notch behavior. These physical-device and WebKit checks were not performed in this environment. Emulation is not a claim of those checks passing.
- Local preview is retained at http://localhost:3000/. Nothing was committed, pushed, or published.

---

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
