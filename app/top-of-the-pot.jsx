import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatScoreDate } from '@/lib/game/high-scores';
import './top-of-the-pot.css';

export function ScoreNote({ scores, open, onOpen, noteRef, disabled }) {
  const first = scores[0];
  return (
    <button
      ref={noteRef}
      className="score-note"
      onClick={onOpen}
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Top Of The Pot. ${first ? `High score ${first.score.toLocaleString()}.` : 'None yet.'} View top five scores`}
    >
      <span className="note-heading">Top Of The Pot</span>
      <strong className="note-score">
        {first ? (
          <>
            <small>#1</small> {first.score.toLocaleString()}
          </>
        ) : (
          'None yet'
        )}
      </strong>
      <span className="note-hint">See top 5 ↗</span>
    </button>
  );
}

export function ScoreLeaderboard({ scores, open, onOpenChange, saved, phone, returnFocusRef }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`pot-dialog ${phone ? 'phone-dialog' : ''}`} finalFocus={returnFocusRef}>
        <DialogTitle>Top Of The Pot</DialogTitle>
        <DialogDescription>
          Your five best pots, saved in this browser.
        </DialogDescription>
        {scores.length ? (
          <ol className="pot-scores">
            {scores.map((entry, index) => (
              <li key={entry.id}>
                <span className="pot-rank">#{index + 1}</span>
                <strong>{entry.score.toLocaleString()}</strong>
                {entry.date ? (
                  <time dateTime={entry.date}>
                    {formatScoreDate(entry.date)}
                  </time>
                ) : (
                  <span className="pot-date">Earlier game</span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="pot-empty">None yet</p>
        )}
        {!saved && (
          <output className="pot-storage-warning">
            Browser storage is unavailable. These scores will last until you
            close or reload this game.
          </output>
        )}
        <button className="pot-resume" onClick={() => onOpenChange(false)}>
          Back to the soup
        </button>
      </DialogContent>
    </Dialog>
  );
}
