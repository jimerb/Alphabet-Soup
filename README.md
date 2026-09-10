# Alphabet Soup

A desktop-first, responsive, turn-based word game built from the supplied build instructions, gameplay specification, main-screen mockup, and character sheet.

## Run

Use `pnpm install`, then `pnpm dev`. `pnpm build` exports the static game. `node --test tests/engine.test.js` runs the independent game-rule tests.

The local preview listens on all network interfaces on port 3000. Other devices
on the same network can open `http://192.168.1.103:3000/` while this computer keeps
the preview running (update the address if its LAN IP changes). Localhost still
works on this computer. LAN HTTP supports play and sound, but browsers disable
Web Locks there, so runs use memory-only play with the existing save warning.
Reloading this preview can lose the run; normal HTTPS hosting retains automatic
save and resume. This does not expose any additional ports or publish the game.

## Architecture

- `lib/game/engine.js`: seeded randomness, board geometry, trie dictionary, scoring, turn phases, gravity, fire, rewards, bonus words, and scramble.
- `app/page.jsx`: accessible pointer/keyboard controller, phase playback, character reactions, audio, settings, dialogs, and WebMCP actions.
- `app/globals.css`: brass and ivory kitchen presentation, staggered geometry, responsive layout, fire and falling animation.
- `public/assets`: background and individually cropped character sprites; source uploads remain in the parent workspace.

## Configurable proposed defaults

The gameplay document's proposed values are the initial rules. `BALANCE`, `VALUES`, `TIERS`, and `CAPACITIES` are the configuration boundary. Word length means actual letters except in score calculation. All generation uses seeded randomness. Fresh games insert the adjacent word SOUP in the center column to provide an approachable opening. This is an explicit first-version default, not a requirement from the source rules.

Dictionary: bundled `sindresorhus/word-list` list, downloaded 2026-09-05, alphabetic entries of at least three letters, case-insensitive. Source: https://github.com/sindresorhus/word-list . Its MIT license is retained in `public/DICTIONARY-LICENSE.txt`. Common nouns that also happen to be names (for example john and terry) remain valid in their ordinary-word sense. Repeated words and listed inflections are allowed; punctuation forms and proper-name-only entries are not intentionally included. Vocabulary is broad, including uncommon words. No network lookup is needed once the dictionary loads from the game's own files.

Music is a quiet synthesized melody and defaults to muted. Effects default to 55%. Sound only initializes on user interaction. Reduced motion follows the system on first visit; local overrides and best score persist on the same browser. Active runs and unfinished selections automatically resume on reload.

The score counts up with quiet ticks, and falling letters have a short crouton-like landing and bob. Clear word is a prominent button with a 44px minimum target. Fire damage has a subtle singe; completing the exact bonus word plays a reward chime. A fatal bottom fire plays the supplied `LosingHorn.m4a`. All effects follow the effects volume and mute controls, separately from music. Muting or restarting stops the horn; Reduced motion makes score changes and tile placement immediate.

Top Of The Pot and the current game share one versioned localStorage record (`alphabet-soup-save`). Completed moves are saved before animation playback; each run has one permanent ID, so improvements replace its own leaderboard entry even after reopening. The complete board, score, level, bonus, fire conditions, turn, seed, tile counter, selected path, and keyboard focus resume automatically. Finished games retain their final board; New Game replaces the checkpoint while keeping earned scores. Dates retain the local calendar day of the achievement and existing tie ordering.

The first save imports real dated entries from `alphabet-soup-high-scores`, leaving that legacy key untouched for recovery. Damaged boards are discarded while valid leaderboard entries survive. Unknown save versions remain untouched. Storage failures keep play available with a persistent warning and retry on the next change. Web Locks plus revisions prevent a stale tab from replacing newer progress; on conflict the latest game is restored and the action must be retried. Browsers without Web Locks use memory-only play with a warning. Browser/profile/site changes do not transfer saves; clearing site data and ending private browsing may remove them. This feature does not add offline loading or cloud syncing. The marker font is bundled with its license in `public/fonts`.

Hot tiles carry two subtle smoke wisps. A dedicated foreground layer keeps steam above every board column. The emitter moves with the tile, softens during falling and scrambling, disappears with cleared tiles, and is hidden by Reduced motion.

Developer fixture: in local development, open `/?fixture=mockup` for the exact reference letters and reward positions, including damaged diamond and urgent bottom red S. `/?seed=123` reproduces a starting seed. Production ignores the developer fixture. Explicit seeded sessions and the development fixture neither read nor write the normal game save or leaderboard.

## Verification

### Phone play

Touch-capable screens below 600 CSS pixels use a phone layout: score and level,
bonus/fire information, the complete current word above all 52 tiles, and Clear,
Submit, and Scramble below. More opens a paused bottom sheet for settings, help,
high scores, turn information, and New Game. Existing desktop and normal tablet
layouts retain their original sizing.

Phone tiles target 44–52px height, with a 40px minimum in short browser windows;
action buttons stay at least 44px tall. Portrait is primary. Landscape below
1000px wide and 500px tall uses a board-and-controls arrangement when it fits;
otherwise an upright-phone prompt preserves the game and selection. Browser
zoom remains enabled. Sound resumes on the next interaction after suspension
or Safari interruption, retaining the existing volume and mute preferences.

Supported sizing targets start at 360px-wide Android phones and second/third
generation iPhone SE or larger. Real-device Safari/Chrome audio, browser chrome,
and lock-screen interruption checks remain part of release acceptance; see the
latest entry in `VERIFICATION.md`.

51 independent tests pass, including 100 simulated accepted moves, fixed board capacities, adjacency, invalid-action immutability, downward compaction, reward damage, response turns, stacked fire, new-fire delay, scramble, scoring, bonus progression, leaderboard persistence, phone sizing, pointer ownership/cancellation, and audio interruption/mute/reset behavior. Run `pnpm test` for the complete suite. Browser checks and delivery details are recorded in `VERIFICATION.md`.
