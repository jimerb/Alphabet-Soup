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

Developer fixture: in local development, open `/?fixture=mockup` for the exact reference letters and reward positions, including damaged diamond and urgent bottom red S. `/?seed=123` reproduces a starting seed. Production ignores the developer fixture. No fixture mutates an already-running board.

## Verification

17 independent tests pass, including 100 simulated accepted moves, fixed board capacities, adjacency, invalid-action immutability, downward compaction, reward damage, response turns, stacked fire, new-fire delay, scramble, scoring, and bonus progression. Browser checks and final delivery details are recorded in `VERIFICATION.md`.
