# How to play Alphabet Soup

[← Overview & screenshots](../README.md) · [Play the game](https://jimerb.github.io/Alphabet-Soup/)

Build words, score points, and keep burning tiles from reaching the bottom of
the soup. There is no timer. Only an accepted word or successful scramble spends
a turn; selecting, clearing, and invalid attempts are free.

## Connect a word

Click, tap, or drag through at least **three neighboring letters**. On the
staggered board, a tile connects above and below and to the two nearest tiles
on either side. Each tile can be used once per word. Q and U are separate tiles.

The current-word panel shows whether your word is valid and previews its points.
Choose **Submit** or press **Enter** to play it. Used letters disappear; survivors
fall straight down within their columns and new tiles fill from above.

You can repeat words. The bundled dictionary includes inflections and uncommon
words; acceptance follows that list. Proper-name-only entries, abbreviations,
and punctuation spellings are not intentionally included. Some ordinary words
are also names. No online dictionary lookup is needed.

## Scoring

**Word score = 10 × effective length × (letter-value sum + starting level)**

Effective length is the number of tiles in your word **plus the boosts from all
reward tiles you use**. Colored tiles do not have a fixed point award. Their
letters still contribute their usual values, and multiple boosts stack.

| Letters | Value per letter |
| :--- | ---: |
| A E I O S | 1 |
| L N R T U | 2 |
| D G | 3 |
| B C M P | 4 |
| F H V | 5 |
| W Y | 6 |
| K Q | 7 |
| J X | 8 |
| Z | 10 |

At Level 1, **SOUP** has four letters worth 1 + 1 + 2 + 4 = 8:

- Ordinary tiles: 10 × 4 × (8 + 1) = **360 points**.
- One Green tile: 10 × (4 + 2) × (8 + 1) = **540 points**.
- One Green and one Gold tile: 10 × (4 + 2 + 4) × (8 + 1) = **900 points**.

### Colored tiles

Long words upgrade one available ordinary, non-burning tile after the board
refills. Include that reward in a **later word** to use its boost.

| Tile | Earn by playing | Added scoring length | Total fire hits before destruction |
| :--- | :--- | ---: | ---: |
| Ivory (ordinary) | Default tile | +0 | 1 |
| ♧ Green | 5 letters | +2 | 2 |
| ★ Gold | 6 letters | +4 | 3 |
| ◆ Sapphire | 7 letters | +7 | 4 |
| ◇ Diamond | 8 or more letters | +10 | 5 |

Fire damage persists: a previously damaged tile has fewer hits left. Reward
eligibility uses **actual letters**, not boosted scoring length. Red burning
tiles score their letter normally and are removed when used in a word.

## Fire & survival

After your move clears letters and the board settles, each existing red tile
hits the tile directly below it. An ordinary tile disappears in one hit;
reward tiles absorb more. Destroyed tiles leave gaps, and the column settles
again. **Fire consumes tiles; it never pushes them out of the bottom.** A red
tile does not burn another red tile.

**When fire reaches the bottom, you get one rescue move.** Your next valid word
must include **every** red tile already at the bottom. Leaving even one ends
the game. You can take your time choosing that word; invalid attempts do not
use up the rescue move. Scramble is unavailable during a bottom-fire emergency.

Three- and four-letter words increase fire pressure, while words of five or more
reduce it. Scrambling increases pressure too. New fires appear on available
ordinary tiles at the top and do not burn on the turn they appear. Higher
levels bring fire more often.

## Levels & exact bonus words

Every **10,000 total points** advances one level. Your word is scored using the
level at the start of the turn. From Level 2, you also receive a bonus target:

| Level when a new target is assigned | Target length |
| :--- | ---: |
| 2–3 | 4 letters |
| 4–5 | 5 letters |
| 6–7 | 6 letters |
| 8 onward | 7 letters |

A new target cannot already be connected on the board. Play other words to drop
letters into place and bring in fresh ones. The current target stays until you
complete it, even if you level up. Submit the **exact word** to earn the displayed
award in addition to your normal word score. Awards begin at **1,000 points**,
increase by 1,000 after each completion, and stop increasing at **10,000**.

## Controls

| Action | Mouse / touch | Keyboard |
| :--- | :--- | :--- |
| Build a word | Click, tap, or drag through adjacent tiles | Arrow keys navigate; Space selects |
| Undo the last letter | Select the last tile again | Space on the last tile |
| Backtrack | Select an earlier tile; keep it and trim the rest | Navigate to that tile and press Space |
| Clear selection | Clear | Escape when no dialog is open |
| Play a word | Submit | Enter |

**Scramble** shuffles non-burning letters while rewards remain in place. It costs
a turn, advances existing fire, and adds pressure without scoring points. If no
playable scramble can be found, the board and turn stay unchanged.

On desktop, **?** opens help, the **gear** opens settings, and **Top Of The Pot**
opens your local high scores. On phones, **More** contains help, settings, high
scores, turn information, and New Game. Dialogs pause play; close them or choose
Resume to continue your selection. New Game asks before replacing your run.

## Saves, scores & comfort settings

When saving is available, your board, score, level, bonus, fire state, and
unfinished selection automatically resume in the same browser. **Top Of The
Pot** records your five best runs as they qualify or improve, without waiting
for game over. A run improves its own entry instead of taking multiple places.
New Game keeps your earned scores; a finished game retains its final board
until you start again.

Settings offer independent music and effects volume/mute controls, reduced
motion, and high contrast. Sound starts after an interaction. Reduced motion
initially follows your system preference; your overrides stay in this browser.

## Add the game to your phone or tablet

For one-tap access on iOS or Android, add the game to your Home Screen. In
**Safari on iPhone or iPad**, open the game, tap **Share** → **More** → **Add to
Home Screen**, then tap **Add**. You can turn on **Open as Web App** to make it
open like an app. In **Chrome on Android**, open the game, tap **⋮** → **Install
app** or **Add to Home screen**, then follow the prompts. The exact label can
vary by browser and device. Windows browsers can bookmark the link normally.

No account or persistent backend is needed. Saves use browser **localStorage**,
not cloud storage. Use the same browser, profile, and site address to continue.
Clearing site data or ending private browsing may erase progress. A save
warning means your run may not survive a reload; keep the tab open. HTTPS or
localhost and Web Locks support are required for durable saving. The game does
not provide cloud sync or guaranteed offline loading.

The dictionary’s attribution and license are in the repository’s
[dictionary license](../public/DICTIONARY-LICENSE.txt).
