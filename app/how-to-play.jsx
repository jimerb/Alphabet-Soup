import { TIERS, VALUES } from '@/lib/game/engine';

export default function HowToPlay() {
  return (
    <div className="how-to help-guide">
      <section className="help-card help-wide">
        <h3>Make a word. Keep the soup simmering.</h3>
        <ol>
          <li>
            <strong>Connect 3 or more letters.</strong> Click, tap, or drag
            through neighboring tiles: above, below, or either of the two
            nearest tiles on each side. Use each tile only once. Q and U are
            separate letters.
          </li>
          <li>
            <strong>Check your word, then Submit.</strong> The preview shows
            whether it is valid and what it will score. Cleared letters
            disappear, tiles fall straight down, and fresh letters fill from
            above.
          </li>
          <li>
            <strong>Watch the fire.</strong> Use red tiles in words before they
            burn through the bottom. There is no timer: think as long as you
            like. Invalid attempts cost no turn.
          </li>
        </ol>
      </section>

      <section className="help-card">
        <h3>Letter values</h3>
        <p>Each letter contributes this value to your word’s score.</p>
        <dl className="letter-values">
          {[...new Set(Object.values(VALUES))].map((value) => (
            <div key={value}>
              <dt>
                {Object.keys(VALUES)
                  .filter((letter) => VALUES[letter] === value)
                  .join(' ')}
              </dt>
              <dd>
                <strong>{value}</strong>{' '}
                <span>{value === 1 ? 'point' : 'points'}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="help-card">
        <h3>Colored tile rewards</h3>
        <p>
          <strong>These boost scoring length, not fixed points.</strong> Play a
          long word to upgrade one available ordinary tile. Use that reward in a
          later word to collect its boost.
        </p>
        <div className="reward-guide">
          {['green', 'gold', 'sapphire', 'diamond'].map((tier, index) => (
            <div className="reward-row" key={tier}>
              <span className={`help-swatch ${tier}`} aria-hidden="true">
                {TIERS[tier].symbol}
              </span>
              <div>
                <strong>{tier[0].toUpperCase() + tier.slice(1)}</strong>
                <span>Earn with {index === 3 ? '8+' : index + 5} letters</span>
              </div>
              <div className="reward-stats">
                <strong>+{TIERS[tier].bonus} length</strong>
                <span>{TIERS[tier].hits} fire hits</span>
              </div>
            </div>
          ))}
        </div>
        <p className="help-note">
          Boosts stack when you use several rewards. Fire hits are total hits
          before destruction; damage stays. Ordinary ivory tiles have no boost
          and burn in one hit. Red tiles score their letter normally.
        </p>
      </section>

      <section className="help-card help-wide">
        <h3>How your score adds up</h3>
        <div className="score-recipe">
          10 × effective length × (letter values + level)
        </div>
        <p>
          <strong>
            Effective length = actual letters + all reward boosts in your word.
          </strong>{' '}
          Reward eligibility and bonus-word length use actual letters only. Word
          scoring uses the level at the start of your turn.
        </p>
        <p className="help-example">
          <strong>Try SOUP at Level 1:</strong> S (1) + O (1) + U (2) + P (4) =
          8.
          <br />
          With ordinary tiles: 10 × 4 × (8 + 1) = <strong>360 points.</strong>
          <br />
          With one Green tile: 10 × (4 + 2) × (8 + 1) ={' '}
          <strong>540 points.</strong>
        </p>
      </section>

      <section className="help-card">
        <h3>Fire & the rescue move</h3>
        <p>
          Each existing red tile hits the tile directly below it after your
          move. Destroyed tiles disappear and the column settles.{' '}
          <strong>Fire consumes; it never pushes tiles out.</strong> Rewards
          resist fire until their remaining hits run out.
        </p>
        <p>
          <strong>Bottom fire gets one rescue move.</strong> Your next valid
          word must remove every red tile already at the bottom, or the game
          ends. Scramble cannot rescue you.
        </p>
        <p>
          Three- and four-letter words build fire pressure; words of five or
          more reduce it. Scrambling adds pressure too. New fires appear at the
          top and start burning on a later turn. Higher levels bring fire more
          often.
        </p>
      </section>

      <section className="help-card">
        <h3>Levels & bonus words</h3>
        <p>
          Advance a level every <strong>10,000 points</strong>. Exact bonus
          words unlock at Level 2 and add the displayed award on top of your
          word score.
        </p>
        <dl className="bonus-levels">
          <div>
            <dt>Levels 2–3</dt>
            <dd>4 letters</dd>
          </div>
          <div>
            <dt>Levels 4–5</dt>
            <dd>5 letters</dd>
          </div>
          <div>
            <dt>Levels 6–7</dt>
            <dd>6 letters</dd>
          </div>
          <div>
            <dt>Level 8+</dt>
            <dd>7 letters</dd>
          </div>
        </dl>
        <p>
          Your target stays until completed. A new target cannot already be
          connected: clear other words to bring its letters together. Awards
          start at <strong>1,000</strong>, grow by 1,000 per completion, and cap
          at <strong>10,000</strong>.
        </p>
      </section>

      <section className="help-card">
        <h3>Controls & changing your mind</h3>
        <ul>
          <li>
            <strong>Backtrack:</strong> select an earlier tile to keep it and
            remove everything after it. Select the last tile to undo it.
          </li>
          <li>
            <strong>Clear:</strong> start your selection over for free.
          </li>
          <li>
            <strong>Keyboard:</strong> arrows navigate, Space selects, Enter
            submits, Escape clears when no dialog is open.
          </li>
          <li>
            <strong>Scramble:</strong> shuffle non-burning letters while reward
            tiles stay in place. It costs a turn and existing fire advances.
          </li>
        </ul>
        <p>
          On a phone, <strong>More</strong> opens help, settings, high scores,
          and New Game. On desktop, use <strong>?</strong>, the gear, and Top Of
          The Pot.
        </p>
      </section>

      <section className="help-card">
        <h3>Your words & your progress</h3>
        <p>
          Words can be played again. The bundled dictionary includes inflections
          and uncommon words; acceptance follows that list. Proper-name-only
          entries, abbreviations, and punctuation spellings are not
          intentionally included.{' '}
          <a
            href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/DICTIONARY-LICENSE.txt`}
            target="_blank"
            rel="noreferrer"
          >
            Dictionary license
          </a>
        </p>
        <p>
          Your game and unfinished selection resume automatically in the same
          browser when saving is available. <strong>Top Of The Pot</strong>{' '}
          keeps your five best runs as you play. New Game keeps those scores.
        </p>
        <p>
          Settings include music, effects, reduced motion, and high contrast.
          Saves stay in this browser and do not sync across devices. Clearing
          site data can erase them; a visible save warning means progress may
          not survive a reload.
        </p>
      </section>
    </div>
  );
}
