'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Settings,
  RotateCw,
  Flame,
  Volume2,
  Music,
  Undo2,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  newGame,
  fixture,
  extendPath,
  neighbors,
  yOf,
  WordService,
  resolve,
  scoreWord,
  danger,
  CAPACITIES,
  TIERS,
} from '@/lib/game/engine';
const DEFAULTS = {
  sound: 55,
  music: 25,
  soundMute: false,
  musicMute: true,
  motion: false,
  contrast: false,
};
const PHASE_TEXT = {
  SCORE_AND_REMOVE: 'Word served!',
  GRAVITY: 'Letters are settling…',
  FIRE_DAMAGE: 'Fire burns the tile below…',
  FIRE_GRAVITY: 'Burning tiles settle…',
  REFILL: 'Fresh letters arriving…',
  REWARD_PROMOTION: 'A reward tile!',
  FIRE_CREATION: 'A new burning tile!',
  LEVEL_AND_BONUS_UPDATE: 'Ready for your next word.',
  SCRAMBLE: 'Stirring the letters…',
  GAME_OVER: 'The fire reached the base.',
};
class SoundKitchen {
  constructor() {
    this.ctx = null;
  }
  start() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  note(f, v, d = 0.18, type = 'sine') {
    if (!this.ctx || !v) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(v * 0.15, c.currentTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + d + 0.03);
  }
  close() {
    this.ctx?.close();
  }
}
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
function Character({ pose, motion, warning, over }) {
  const [blink, setBlink] = useState('open');
  useEffect(() => {
    if (motion) return;
    let half, closed;
    const t = setInterval(() => {
      setBlink('half');
      half = setTimeout(() => setBlink('closed'), 45);
      closed = setTimeout(() => setBlink('open'), 145);
    }, 4300);
    return () => {
      clearInterval(t);
      clearTimeout(half);
      clearTimeout(closed);
    };
  }, [motion]);
  const p = over || warning ? 2 : pose;
  return (
    <div
      className={`character ${motion ? 'still' : ''} ${warning ? 'worried' : ''}`}
      data-reaction={
        over ? 'game-over' : warning ? 'fire-warning' : `word-${p}`
      }
    >
      <img
        src={`${basePath}/assets/can-${p}.png`}
        alt={
          over
            ? 'Soup can looking tired'
            : warning
              ? 'Soup can worried about the fire'
              : p >= 5
                ? 'Soup can celebrating your word'
                : 'Your soup-can companion'
        }
      />
      {blink !== 'open' && (
        <div
          className={`blink-eyes pose-${p}`}
          style={{
            backgroundImage: `url('${basePath}/assets/eyes-${blink}.png')`,
          }}
        />
      )}
    </div>
  );
}
export default function Home() {
  const [state, setState] = useState(() => newGame(502));
  const [display, setDisplay] = useState(state.board);
  const [path, setPath] = useState([]);
  const [service, setService] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [settings, setSettings] = useState(DEFAULTS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [fit, setFit] = useState({ width: 1170, scale: 1, compact: false });
  const [restartOpen, setRestartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('PLAYER_INPUT');
  const [active, setActive] = useState([]);
  const [message, setMessage] = useState(
    'A fresh pot! Try S → O → U → P down the middle.',
  );
  const [pose, setPose] = useState(3);
  const [best, setBest] = useState(0);
  const [focusId, setFocusId] = useState('t0');
  const [trapped, setTrapped] = useState(false);
  const locked = useRef(false),
    mounted = useRef(true),
    dragging = useRef(false),
    lastTouched = useRef(null),
    boardRef = useRef(null),
    viewportRef = useRef(null),
    stageRef = useRef(null),
    helpRef = useRef(null),
    gearRef = useRef(null),
    audio = useRef(null),
    poseTimer = useRef(null),
    latest = useRef(null);
  const hazards = danger(state.board);
  const selected = path
    .map((id) => state.board.find((t) => t.id === id))
    .filter(Boolean);
  const word = selected.map((t) => t.letter).join('');
  const valid = word.length >= 3 && service?.isValidWord(word);
  const preview = valid
    ? scoreWord(selected, state.level) +
      (word === state.bonusTarget ? state.bonusAward : 0)
    : 0;
  const playable =
    !busy &&
    state.status === 'playing' &&
    !settingsOpen &&
    !helpOpen &&
    !restartOpen &&
    !!service;
  const available = path.length
    ? neighbors(state.board, path.at(-1)).map((t) => t.id)
    : [];
  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    let lastSize = '';
    let frame;
    const resize = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const size = `${width}:${height}:${window.devicePixelRatio}`;
      if (size === lastSize) return;
      lastSize = size;
      const compact = width <= 700;
      const stageWidth = compact
        ? Math.max(320, width)
        : Math.max(1040, Math.min(1240, width));
      // Measure at the new viewport's layout width, never the previous width.
      stage.style.width = `${stageWidth}px`;
      stage.style.setProperty(
        '--tile',
        `${
          compact
            ? Math.min(60, (stageWidth - 86) / 7)
            : Math.min(90, (stageWidth - 570) / 7)
        }px`,
      );
      setFit({
        width: stageWidth,
        compact,
        scale: Math.min(
          1,
          width / Math.max(stageWidth, stage.scrollWidth),
          height / stage.offsetHeight,
        ),
      });
    };
    const scheduleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    };
    // Gameplay changes the stage's contents, not the available screen space.
    const observer = new ResizeObserver(scheduleResize);
    observer.observe(viewport);
    window.addEventListener('resize', scheduleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleResize);
      cancelAnimationFrame(frame);
    };
  }, []);
  useEffect(() => {
    mounted.current = true;
    fetch(`${basePath}/words.txt`)
      .then((r) => {
        if (!r.ok) throw Error();
        return r.text();
      })
      .then((t) => {
        if (mounted.current) setService(new WordService(t.split(/\r?\n/)));
      })
      .catch(() => setLoadError(true));
    try {
      const saved = JSON.parse(
        localStorage.getItem('alphabet-soup-settings') || 'null',
      );
      setSettings({
        ...DEFAULTS,
        motion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        ...saved,
      });
      setBest(Number(localStorage.getItem('alphabet-soup-best')) || 0);
    } catch {}
    setPrefsLoaded(true);
    const params = new URLSearchParams(location.search);
    if (import.meta.env.DEV && params.get('fixture') === 'mockup') {
      const s = fixture();
      setState(s);
      setDisplay(s.board);
      setMessage('Clear this burning tile on your next move.');
    } else if (params.has('seed')) {
      const s = newGame(Number(params.get('seed')) || 502);
      setState(s);
      setDisplay(s.board);
    }
    return () => {
      mounted.current = false;
      clearTimeout(poseTimer.current);
      audio.current?.close();
    };
  }, []);
  useEffect(() => {
    if (prefsLoaded)
      try {
        localStorage.setItem(
          'alphabet-soup-settings',
          JSON.stringify(settings),
        );
      } catch {}
  }, [settings, prefsLoaded]);
  useEffect(() => {
    if (!service || !hazards.bottom.length) {
      setTrapped(false);
      return;
    }
    setTrapped(
      !service.findRescueWord(
        state.board,
        hazards.bottom.map((t) => t.id),
      ),
    );
  }, [state, service]);
  useEffect(() => {
    if (settings.musicMute || settingsOpen || helpOpen || restartOpen) return;
    let i = 0;
    const melody = [
      261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23, 246.94, 293.66,
      392, 293.66,
    ];
    const t = setInterval(() => {
      audio.current?.note(
        melody[i++ % melody.length],
        settings.music / 100,
        0.8,
      );
    }, 620);
    return () => clearInterval(t);
  }, [settings.music, settings.musicMute, settingsOpen, helpOpen, restartOpen]);
  function startSound() {
    if (!audio.current) audio.current = new SoundKitchen();
    audio.current.start();
  }
  function chime(kind) {
    if (settings.soundMute) return;
    const v = settings.sound / 100;
    audio.current?.note(
      kind === 'invalid'
        ? 140
        : kind === 'fire'
          ? 95
          : kind === 'word'
            ? 523
            : 330,
      v,
      kind === 'word' ? 0.35 : 0.12,
      kind === 'fire' ? 'triangle' : 'sine',
    );
  }
  function reactTo(length) {
    clearTimeout(poseTimer.current);
    setPose(Math.min(7, Math.max(2, length)));
    poseTimer.current = setTimeout(() => setPose(3), 2400);
  }
  function select(id) {
    if (!playable) return;
    startSound();
    setPath((p) => extendPath(state.board, p, id));
    setFocusId(id);
    chime('tile');
  }
  async function commit(type, providedPath) {
    if (locked.current || !playable)
      return { error: 'The game is paused or resolving.' };
    startSound();
    const result = resolve(
      state,
      { type, path: providedPath ?? path },
      service,
    );
    if (result.error) {
      setMessage(result.error);
      reactTo(2);
      chime('invalid');
      return { error: result.error };
    }
    locked.current = true;
    setBusy(true);
    setPath([]);
    setTrapped(false);
    reactTo(result.actual || 3);
    chime(type === 'word' ? 'word' : 'tile');
    for (const frame of result.frames) {
      if (!mounted.current) return;
      setDisplay(frame.board);
      setPhase(frame.phase);
      setActive(frame.active);
      setMessage(PHASE_TEXT[frame.phase]);
      if (frame.phase === 'FIRE_DAMAGE' && frame.active.length) chime('fire');
      await new Promise((r) =>
        setTimeout(
          r,
          settings.motion
            ? 35
            : frame.phase === 'SCORE_AND_REMOVE'
              ? 260
              : frame.phase === 'FIRE_DAMAGE'
                ? 420
                : frame.phase === 'REFILL'
                  ? 300
                  : 200,
        ),
      );
    }
    if (!mounted.current) return;
    setState(result.state);
    setDisplay(result.state.board);
    setActive([]);
    setPhase('PLAYER_INPUT');
    setBusy(false);
    locked.current = false;
    const h = danger(result.state.board);
    setMessage(
      result.state.status === 'game-over'
        ? 'The fire burned through. Your final board is here to inspect.'
        : h.bottom.length
          ? 'Clear this burning tile on your next move.'
          : type === 'word'
            ? `${result.word} · +${result.points.toLocaleString()} points${result.bonus ? ' · Bonus word!' : ''}`
            : 'Freshly stirred. Find your next word.',
    );
    setFocusId(result.state.board[0]?.id);
    if (result.state.score > best) {
      setBest(result.state.score);
      try {
        localStorage.setItem('alphabet-soup-best', String(result.state.score));
      } catch {}
    }
    return {
      word: result.word,
      points: result.points,
      score: result.state.score,
      status: result.state.status,
      turn: result.state.turnNumber,
    };
  }
  function reset() {
    const s = newGame(Date.now());
    setState(s);
    setDisplay(s.board);
    setPath([]);
    setPhase('PLAYER_INPUT');
    setActive([]);
    setPose(3);
    setTrapped(false);
    setRestartOpen(false);
    setMessage('A fresh pot! Try S → O → U → P down the middle.');
    setFocusId('t0');
  }
  function keyboard(e, t) {
    if (!playable) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commit('word');
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setPath([]);
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      setPath((p) => p.slice(0, -1));
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      select(t.id);
      return;
    }
    const arrows = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    if (!arrows[e.key]) return;
    e.preventDefault();
    const [dx, dy] = arrows[e.key];
    const options = neighbors(state.board, t.id)
      .filter((n) =>
        dx
          ? Math.sign(n.column - t.column) === dx
          : n.column === t.column && Math.sign(n.row - t.row) === dy,
      )
      .sort((a, b) => Math.abs(yOf(a) - yOf(t)) - Math.abs(yOf(b) - yOf(t)));
    if (options[0]) {
      setFocusId(options[0].id);
      boardRef.current
        ?.querySelector(`[data-tile="${options[0].id}"]`)
        ?.focus();
    }
  }
  latest.current = { state, commit, playable };
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tool = (name, description, inputSchema, execute, readOnlyHint) => {
      try {
        Promise.resolve(
          context.registerTool(
            {
              name,
              description,
              inputSchema,
              execute,
              annotations: { readOnlyHint, untrustedContentHint: false },
            },
            { signal: lifecycle.signal },
          ),
        ).catch(() => {});
      } catch {}
    };
    tool(
      'read_alphabet_soup',
      'Read current letter coordinates, hazards, score and whether the game accepts a move.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => ({
        board: latest.current.state.board,
        score: latest.current.state.score,
        level: latest.current.state.level,
        status: latest.current.state.status,
        canPlay: latest.current.playable,
      }),
      true,
    );
    tool(
      'submit_alphabet_soup_word',
      'Submit an ordered adjacent path of tile IDs. This commits one game turn if valid.',
      {
        type: 'object',
        properties: {
          tileIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 3,
            maxItems: 52,
          },
        },
        required: ['tileIds'],
        additionalProperties: false,
      },
      async (input) => {
        if (
          !Array.isArray(input?.tileIds) ||
          !input.tileIds.every((i) => typeof i === 'string')
        )
          throw Error('tileIds must be an array of strings.');
        return latest.current.commit('word', input.tileIds);
      },
      false,
    );
    return () => lifecycle.abort();
  }, []);
  const closeSettings = () => {
    setSettingsOpen(false);
    requestAnimationFrame(() => gearRef.current?.focus());
  };
  return (
    <main
      ref={viewportRef}
      className={`kitchen ${settings.motion ? 'reduced-motion' : ''} ${settings.contrast ? 'high-contrast' : ''}`}
      style={{ '--asset-url': `url('${basePath}/assets/kitchen.png')` }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !settingsOpen && !helpOpen && !restartOpen)
          setPath([]);
      }}
    >
      <div
        ref={stageRef}
        className="game-stage"
        style={{
          width: fit.width,
          transform: `scale(${fit.scale})`,
          '--tile': `${fit.compact ? Math.min(60, (fit.width - 86) / 7) : Math.min(90, (fit.width - 570) / 7)}px`,
        }}
      >
        <button
          ref={helpRef}
          className="gear help-button"
          title="How to play & scoring"
          aria-label="How to play and scoring"
          disabled={busy}
          onClick={() => setHelpOpen(true)}
        >
          ?
        </button>
        <button
          ref={gearRef}
          className="gear"
          title="Settings"
          aria-label="Settings"
          disabled={busy}
          onClick={() => {
            startSound();
            setSettingsOpen(true);
          }}
        >
          <Settings size={24} />
        </button>
        <h1>
          Alphabet S<span className="title-o">o</span>up
        </h1>
        <div className="game-layout">
          <aside className="left-panel">
            <div className="score-panel brass">
              <h2>Score</h2>
              <strong className="score" aria-label={`Score ${state.score}`}>
                {state.score.toLocaleString()}
              </strong>
              <span className="medallion" aria-hidden="true">
                ★
              </span>
              <h2>Level</h2>
              <span className="level">{state.level}</span>
              <Character
                pose={pose}
                motion={settings.motion}
                warning={!!hazards.bottom.length}
                over={state.status === 'game-over'}
              />
            </div>
            <button
              className="action brass"
              disabled={!playable || hazards.bottom.length > 0}
              title={
                hazards.bottom.length
                  ? 'A bottom fire must be cleared with a word'
                  : 'Shuffle letters. Costs one turn and advances fire.'
              }
              onClick={() => commit('scramble')}
            >
              <RotateCw size={25} /> Scramble
            </button>
            <button
              className="action teal brass"
              disabled={busy}
              onClick={() =>
                state.status === 'game-over' ? reset() : setRestartOpen(true)
              }
            >
              ♨ New Game
            </button>
            <p className="best">
              Best: {best.toLocaleString()} <span>·</span> Turn{' '}
              {state.turnNumber}
            </p>
          </aside>
          <section
            ref={boardRef}
            className={`board phase-${phase}`}
            aria-label="Letter board"
            aria-busy={busy}
            onPointerMove={(e) => {
              if (!dragging.current || !playable) return;
              const el = document
                .elementFromPoint(e.clientX, e.clientY)
                ?.closest('[data-tile]');
              const id = el?.getAttribute('data-tile');
              if (id && id !== lastTouched.current) {
                select(id);
                lastTouched.current = id;
              }
            }}
            onPointerUp={() => {
              dragging.current = false;
              lastTouched.current = null;
            }}
            onPointerCancel={() => {
              dragging.current = false;
              lastTouched.current = null;
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') {
                dragging.current = false;
                lastTouched.current = null;
              }
            }}
          >
            {Array.from({ length: 7 }, (_, c) => (
              <div
                key={c}
                className={`column brass col-${c}`}
                style={{
                  height: `calc(${CAPACITIES[c]} * (var(--cellh) + 3px) + 5px)`,
                }}
              >
                {display
                  .filter((t) => t.column === c)
                  .map((t) => {
                    const index = path.indexOf(t.id);
                    return (
                      <button
                        key={t.id}
                        data-tile={t.id}
                        aria-label={`${t.letter}, column ${c + 1}, row ${t.row + 1}${t.isRed ? ', burning' : ''}${t.tier !== 'ordinary' ? `, ${t.tier} reward plus ${TIERS[t.tier].bonus}` : ''}${t.burnDamage ? `, ${t.burnDamage} fire damage` : ''}`}
                        aria-pressed={index >= 0}
                        tabIndex={focusId === t.id ? 0 : -1}
                        disabled={!playable}
                        onKeyDown={(e) => keyboard(e, t)}
                        onClick={(e) => {
                          if (e.detail === 0) select(t.id);
                        }}
                        onPointerDown={(e) => {
                          if (!playable || e.button !== 0) return;
                          e.preventDefault();
                          e.currentTarget.focus();
                          dragging.current = true;
                          lastTouched.current = t.id;
                          select(t.id);
                        }}
                        style={{
                          top: `calc(${t.row} * (var(--cellh) + 3px) + 4px)`,
                        }}
                        className={`tile ${t.tier} ${t.isRed ? 'red' : ''} ${t.isRed && t.row === CAPACITIES[c] - 1 ? 'deadline' : ''} ${index >= 0 ? 'selected' : ''} ${available.includes(t.id) && !path.includes(t.id) ? 'eligible' : ''} ${active.includes(t.id) ? 'phase-active' : ''} ${t.burnDamage ? 'damaged' : ''}`}
                      >
                        <span className="letter">{t.letter}</span>
                        {t.tier !== 'ordinary' && (
                          <span className="tier-symbol" aria-hidden="true">
                            {TIERS[t.tier].symbol}
                          </span>
                        )}
                        {t.isRed && (
                          <Flame className="fire-symbol" aria-hidden="true" />
                        )}
                        {t.burnDamage > 0 && (
                          <span className="damage-symbol" aria-hidden="true">
                            {'╱'.repeat(t.burnDamage)}
                          </span>
                        )}
                        {index >= 0 && (
                          <span className="path-number" aria-hidden="true">
                            {index + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            ))}
            {path.length > 1 && (
              <svg
                className="path-lines"
                viewBox="0 0 700 800"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polyline
                  points={selected
                    .map(
                      (t) => `${t.column * 100 + 50},${(yOf(t) + 0.5) * 100}`,
                    )
                    .join(' ')}
                  fill="none"
                  stroke="#ffe9a3"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </section>
          <aside className="right-panel">
            <section className="word-panel brass">
              <h2 className="ribbon">Current Word</h2>
              <div
                className={`spelling ${word.length > 8 ? 'long-word' : ''}`}
                aria-live="polite"
              >
                {word || '—'}
              </div>
              <p className={valid ? 'valid-note word-points' : ''}>
                {!service ? (
                  loadError ? (
                    'Dictionary unavailable. Reload to retry.'
                  ) : (
                    'Warming up the dictionary…'
                  )
                ) : valid ? (
                  <>
                    <Check size={20} /> {preview.toLocaleString()} points
                  </>
                ) : word.length > 0 && word.length < 3 ? (
                  'Keep going · 3 letters minimum'
                ) : word ? (
                  'Not in the dictionary'
                ) : (
                  'Connect 3 or more letters'
                )}
              </p>
              <button
                className="clear-word"
                style={{ visibility: path.length ? 'visible' : 'hidden' }}
                onClick={() => setPath([])}
                disabled={!playable}
              >
                <Undo2 size={14} /> Clear
              </button>
            </section>
            <button
              className="action brass submit"
              disabled={!playable || !path.length}
              onClick={() => commit('word')}
            >
              Submit <ChevronRight size={22} />
            </button>
            <section className="bonus-panel brass">
              <h2 className="ribbon">Bonus Word</h2>
              <div className="bonus-word">{state.bonusTarget || '♨'}</div>
              <p>
                {state.bonusTarget
                  ? `+${state.bonusAward.toLocaleString()} bonus points`
                  : state.level < 2
                    ? 'Unlocks at Level 2'
                    : 'A new challenge is coming…'}
              </p>
            </section>
            <section
              className={`danger-panel brass ${hazards.bottom.length ? 'urgent' : ''}`}
            >
              <h2 className="ribbon">Fire Danger</h2>
              <div
                className="meter"
                role="meter"
                aria-label="Fire danger"
                aria-valuenow={Math.round(hazards.amount * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <i
                    key={i}
                    className={i < Math.ceil(hazards.amount * 10) ? 'lit' : ''}
                    style={{ '--segment': i }}
                  />
                ))}
              </div>
              <p>
                {state.status === 'game-over'
                  ? 'The fire reached the base.'
                  : hazards.bottom.length
                    ? 'Clear this burning tile on your next move.'
                    : hazards.count
                      ? `${hazards.count} burning ${hazards.count === 1 ? 'tile' : 'tiles'} · Watch the bottom`
                      : 'No burning tiles'}
              </p>
            </section>
          </aside>
        </div>
        <div
          className={`game-message ${hazards.bottom.length ? 'warning-message' : ''}`}
          role="status"
          aria-live="polite"
        >
          {trapped && state.status === 'playing'
            ? 'No valid word can rescue every bottom fire. This board is trapped — start a New Game.'
            : message}
        </div>
        {state.status === 'game-over' && (
          <div className="game-over brass">
            <strong>Soup’s over!</strong>
            <span>Final score: {state.score.toLocaleString()}</span>
            <button className="action teal brass" onClick={reset}>
              Cook up a new game
            </button>
          </div>
        )}
        <footer>
          {state.status === 'game-over'
            ? 'Start a fresh pot when you’re ready.'
            : busy
              ? 'Let the letters settle…'
              : 'Take your time. Fire only moves when you do.'}
          <span className="keyboard-tip">
            {' '}
            Arrows to navigate · Space to select · Enter to submit · Esc to
            clear
          </span>
        </footer>
      </div>
      <Dialog
        open={settingsOpen}
        onOpenChange={(v) => (v ? setSettingsOpen(true) : closeSettings())}
      >
        <DialogContent className="settings-dialog brass">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Your game is paused. Thinking time never costs a turn.
          </DialogDescription>
          <div className="setting">
            <label htmlFor="sound-volume">
              <Volume2 size={18} /> Sound effects · {settings.sound}%
            </label>
            <Slider
              id="sound-volume"
              aria-label="Sound effects volume"
              value={[settings.sound]}
              onValueChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  sound: Array.isArray(v) ? v[0] : v,
                }))
              }
            />
            <label className="toggle">
              Mute effects
              <Switch
                aria-label="Mute sound effects"
                checked={settings.soundMute}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, soundMute: v }))
                }
              />
            </label>
          </div>
          <div className="setting">
            <label htmlFor="music-volume">
              <Music size={18} /> Music · {settings.music}%
            </label>
            <Slider
              id="music-volume"
              aria-label="Music volume"
              value={[settings.music]}
              onValueChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  music: Array.isArray(v) ? v[0] : v,
                }))
              }
            />
            <label className="toggle">
              Mute music
              <Switch
                aria-label="Mute music"
                checked={settings.musicMute}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, musicMute: v }))
                }
              />
            </label>
          </div>
          <label className="toggle">
            Reduced motion
            <Switch
              aria-label="Reduced motion"
              checked={settings.motion}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, motion: v }))}
            />
          </label>
          <label className="toggle">
            High contrast
            <Switch
              aria-label="High contrast"
              checked={settings.contrast}
              onCheckedChange={(v) =>
                setSettings((s) => ({ ...s, contrast: v }))
              }
            />
          </label>
          <button className="action teal brass" onClick={closeSettings}>
            Resume game
          </button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (!open) requestAnimationFrame(() => helpRef.current?.focus());
        }}
      >
        <DialogContent className="settings-dialog brass">
          <DialogTitle>How to Play & Scoring</DialogTitle>
          <DialogDescription>
            Your game is paused. Take your time learning the recipe.
          </DialogDescription>
          <section className="how-to">
            <h3>How to make a delicious word</h3>
            <ol>
              <li>
                Click or drag through at least three neighboring letters. A tile
                connects above, below, and to the two nearest tiles on either
                side. Q and U are separate.
              </li>
              <li>
                Press Submit or Enter. Letters disappear, survivors fall
                straight down, and new letters fill from above.
              </li>
              <li>
                A burning tile eats the tile directly below it each turn. Clear
                it in a word before it burns through the bottom.
              </li>
              <li>
                A fire that reaches the bottom gets one rescue move. Your next
                valid word must remove every bottom fire.
              </li>
            </ol>
            <div className="fire-example">
              <strong>Fire consumes; it never pushes.</strong>
              <code>
                A <b>R</b> C D E F G
              </code>
              <span>↓ R burns C, then falls</span>
              <code>
                X A <b>R</b> D E F G
              </code>
              <small>R is the red tile. G stays at the bottom.</small>
            </div>
            <p>
              <strong>Longer words cool the soup.</strong> Five, six, seven, and
              eight-or-more-letter words earn Green, Gold, Sapphire, and Diamond
              tiles. They add +2, +4, +7, and +10 effective letters to scoring
              and resist 2, 3, 4, and 5 fire hits.
            </p>
            <p>
              <strong>Score:</strong> 10 × effective length × (letter-value sum
              + level). Every 10,000 points advances a level. Exact bonus words
              unlock at Level 2. Each new target has 4 letters at levels 2–3, 5
              at levels 4–5, 6 at levels 6–7, and 7 from level 8 onward. Your
              current target stays until you complete it.
            </p>
            <p>
              <strong>Build toward the bonus.</strong> A new target cannot be
              connected on the board when it is assigned. Clear other words to
              drop letters into place and bring in fresh tiles. Completing the
              exact target adds the displayed bonus on top of your word score.
              Bonuses start at 1,000 points and grow by 1,000 per completion, up
              to 10,000.
            </p>
            <p>
              <strong>Letter values:</strong> A E I O S = 1; L N R T U = 2; D G
              = 3; B C M P = 4; F H V = 5; W Y = 6; K Q = 7; J X = 8; Z = 10.
              Reward bonuses stack in the effective length.
            </p>
            <p>
              <strong>Controls:</strong> Click or drag to select. Click the last
              tile to undo it, or Clear to start over. Use arrow keys to
              navigate, Space to select, Enter to submit, and Escape to clear.
            </p>
            <p>
              <strong>Scramble costs a turn.</strong> Letters shuffle, rewards
              stay, and existing fire advances. It cannot rescue a bottom fire.
            </p>
            <p>
              Words may be played again. Ordinary inflections are accepted;
              proper names, abbreviations, and punctuation-based spellings are
              excluded.{' '}
              <a
                href="/DICTIONARY-LICENSE.txt"
                target="_blank"
                rel="noreferrer"
              >
                Dictionary license
              </a>
            </p>
          </section>
          <button
            className="action teal brass"
            onClick={() => {
              setHelpOpen(false);
              requestAnimationFrame(() => helpRef.current?.focus());
            }}
          >
            Resume game
          </button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={restartOpen} onOpenChange={setRestartOpen}>
        <AlertDialogContent className="restart-dialog brass">
          <AlertDialogTitle>Start a fresh pot?</AlertDialogTitle>
          <AlertDialogDescription>
            Your current score of {state.score.toLocaleString()} will be left
            behind. Your best score stays saved.
          </AlertDialogDescription>
          <div className="dialog-actions">
            <AlertDialogCancel>Keep playing</AlertDialogCancel>
            <AlertDialogAction onClick={reset}>New Game</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
