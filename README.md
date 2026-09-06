# Alphabet Soup

A desktop-first, responsive, turn-based word game built from the supplied build instructions, gameplay specification, main-screen mockup, and character sheet.

## Run

Use `pnpm install`, then `pnpm dev`. `pnpm build` exports the static game. `node --test tests/engine.test.js` runs the independent game-rule tests.

## Architecture

- `lib/game/engine.js`: seeded randomness, board geometry, trie dictionary, scoring, turn phases, gravity, fire, rewards, bonus words, and scramble.
- `app/page.jsx`: accessible pointer/keyboard controller, phase playback, character reactions, audio, settings, dialogs, and WebMCP actions.
- `app/globals.css`: brass and ivory kitchen presentation, staggered geometry, responsive layout, fire and falling animation.
- `public/assets`: background and individually cropped character sprites; source uploads remain in the parent workspace.

## Configurable proposed defaults

The gameplay document's proposed values are the initial rules. `BALANCE`, `VALUES`, `TIERS`, and `CAPACITIES` are the configuration boundary. Word length means actual letters except in score calculation. All generation uses seeded randomness. Fresh games insert the adjacent word SOUP in the center column to provide an approachable opening. This is an explicit first-version default, not a requirement from the source rules.

Dictionary: bundled `sindresorhus/word-list` list, downloaded 2026-09-05, alphabetic entries of at least three letters, case-insensitive. Source: https://github.com/sindresorhus/word-list . Its MIT license is retained in `public/DICTIONARY-LICENSE.txt`. Common nouns that also happen to be names (for example john and terry) remain valid in their ordinary-word sense. Repeated words and listed inflections are allowed; punctuation forms and proper-name-only entries are not intentionally included. Vocabulary is broad, including uncommon words. No network lookup is needed once the dictionary loads from the game's own files.

Music is a quiet synthesized melody and defaults to muted. Effects default to 55%. Sound only initializes on user interaction. Reduced motion follows the system on first visit; local overrides and best score persist on the same browser. Active runs are not saved on reload.

The score counts up with quiet ticks, and falling letters have a short crouton-like landing and bob. Clear word is a prominent button with a 44px minimum target. Fire damage has a subtle singe; completing the exact bonus word plays a reward chime. A fatal bottom fire plays the supplied `LosingHorn.m4a`. All effects follow the effects volume and mute controls, separately from music. Muting or restarting stops the horn; Reduced motion makes score changes and tile placement immediate.

Top Of The Pot keeps the five highest game scores in localStorage (`alphabet-soup-high-scores`). Each accepted turn updates one entry for that run; restarting or reloading begins a separate run. Dates retain the local calendar day when the score was achieved. Equal scores from different games remain separate, with earlier achievements first. Old best-score counters and previously imported legacy entries are ignored; the leaderboard starts at "None yet" until a real score is earned. The development showcase never records scores. Blocked storage falls back to the current page session and shows a notice in the leaderboard. Clearing browser site data removes saved scores. The marker font is bundled with its license in `public/fonts`.

Hot tiles carry two subtle smoke wisps. A dedicated foreground layer keeps steam above every board column. The emitter moves with the tile, softens during falling and scrambling, disappears with cleared tiles, and is hidden by Reduced motion.

Developer fixture: in local development, open `/?fixture=mockup` for the exact reference letters and reward positions, including damaged diamond and urgent bottom red S. `/?seed=123` reproduces a starting seed. Production ignores the developer fixture. No fixture mutates an already-running board.

## Verification

31 independent tests pass, including 100 simulated accepted moves, fixed board capacities, adjacency, invalid-action immutability, downward compaction, reward damage, response turns, stacked fire, new-fire delay, scramble, scoring, bonus progression, six leaderboard persistence/ranking/date tests, and feedback timing, event routing, and audio mute/reset tests. Run `pnpm test` for the complete suite. Earlier browser checks and delivery details are recorded in `VERIFICATION.md`.
