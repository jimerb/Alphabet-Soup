'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import SoupSteam from './soup-steam';
import PhoneCelebration from './phone-celebration';
import AnimatedScore from './animated-score';
import { SoundKitchen } from '@/lib/game/sound-kitchen';
import { tileFalls, phaseSound } from '@/lib/game/feedback';
import { ScoreNote, ScoreLeaderboard } from './top-of-the-pot';
import { SAVE_KEY, readSave, createPersistence } from '@/lib/game/persistence';
import { phoneMode, phoneLayout } from '@/lib/game/phone-layout';
import { tilePointer } from '@/lib/game/tile-pointer';
import { gameId } from '@/lib/game/game-id';
import './tile-smoke.css';
import './phone.css';
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
function storageWarning() {
  return !window.isSecureContext && !navigator.locks
    ? 'This HTTP preview cannot save progress. Keep this tab open while testing. Saving works on the normal HTTPS site; this is not caused by your first visit.'
    : 'Progress could not be saved in this browser.';
}
const DEFAULTS = {
  sound: 55,
  music: 10,
  soundMute: false,
  musicMute: false,
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
  const [falls, setFalls] = useState(() => tileFalls([], state.board));
  const [scoreTarget, setScoreTarget] = useState(state.score);
  const [path, setPath] = useState([]);
  const [service, setService] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [settings, setSettings] = useState(DEFAULTS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [fit, setFit] = useState({ width: 1170, scale: 1, compact: false });
  const [phoneCelebration, setPhoneCelebration] = useState(null);
  const phoneActive = useRef(false);
  useEffect(() => {
    if (!fit.phone) return;
    const image = new Image();
    image.src = `${basePath}/assets/can-7.png`;
  }, [fit.phone]);
  useEffect(() => {
    if (!phoneCelebration) return;
    const timer = setTimeout(() => setPhoneCelebration(null), 4000);
    return () => clearTimeout(timer);
  }, [phoneCelebration]);
  const [restartOpen, setRestartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('PLAYER_INPUT');
  const [active, setActive] = useState([]);
  const [message, setMessage] = useState(
    'A fresh pot! Try S → O → U → P down the middle.',
  );
  const [pose, setPose] = useState(3);
  const [best, setBest] = useState(0);
  const [highScores, setHighScores] = useState([]);
  const [scoresOpen, setScoresOpen] = useState(false);
  const [scoresSaved, setScoresSaved] = useState(true);
  const scoreNoteRef = useRef(null);
  const moreRef = useRef(null);
  const phoneFeedbackRef = useRef(null);
  const gesture = useRef(tilePointer());
  const runId = useRef(null);
  const persistence = useRef(null);
  const checkpoint = useRef(null);
  const isolated = useRef(false);
  const [gameLoaded, setGameLoaded] = useState(false);
  const [restoreEpoch, setRestoreEpoch] = useState(0);
  const [saveWarning, setSaveWarning] = useState('');
  const [focusId, setFocusId] = useState('t0');
  const [trapped, setTrapped] = useState(false);
  const locked = useRef(false),
    mounted = useRef(true),
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
    gameLoaded && !busy &&
    state.status === 'playing' &&
    !settingsOpen &&
    !helpOpen &&
    !restartOpen &&
    !scoresOpen &&
    !moreOpen && !fit.blocked &&
    !!service;
  const available = path.length
    ? neighbors(state.board, path.at(-1)).map((t) => t.id)
    : [];
  const spellingRef = useRef(null);
  useLayoutEffect(() => {
    const spelling = spellingRef.current;
    if (!spelling) return;
    const text = spelling.firstElementChild;
    const fitWord = () => {
      const style = getComputedStyle(spelling);
      const baseSize = parseFloat(style.fontSize);
      const availableWidth = spelling.clientWidth
        - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2;
      if (availableWidth <= 0) return;
      // Measure the complete unwrapped text, independent of clipping and stage scale.
      text.style.fontSize = `${baseSize}px`;
      const naturalWidth = text.offsetWidth;
      text.style.fontSize = `${baseSize * Math.min(1, availableWidth / Math.max(1, naturalWidth))}px`;
    };
    fitWord();
    const observer = new ResizeObserver(fitWord);
    observer.observe(spelling);
    document.fonts.addEventListener('loadingdone', fitWord);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', fitWord);
    };
  }, [word]);
  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    const touch = matchMedia('(any-pointer: coarse)');
    let lastSize = '';
    let frame;
    const resize = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const phone = phoneMode(width, height, touch.matches);
      phoneActive.current = phone;
      if (!phone) setPhoneCelebration(null);
      viewport.dataset.phone = String(phone);
      const safe = getComputedStyle(viewport);
      const safeWidth = width - parseFloat(safe.paddingLeft) - parseFloat(safe.paddingRight);
      const safeHeight = height - parseFloat(safe.paddingTop) - parseFloat(safe.paddingBottom);
      const size = `${safeWidth}:${safeHeight}:${window.devicePixelRatio}:${phone}`;
      if (size === lastSize) return;
      lastSize = size;
      gesture.current.end();
      if (phone) {
        setFit(phoneLayout(safeWidth, safeHeight));
        return;
      }
      const compact = width <= 700;
      const stageWidth = compact
        ? Math.max(320, width)
        : Math.max(1040, Math.min(1240, width));
      // Measure at the new viewport's layout width, never the previous width.
      stage.classList.remove('phone-stage', 'phone-landscape', 'phone-blocked');
      stage.style.removeProperty('--cellh');
      stage.style.removeProperty('height');
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
    window.visualViewport?.addEventListener('resize', scheduleResize);
    touch.addEventListener('change', scheduleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleResize);
      window.visualViewport?.removeEventListener('resize', scheduleResize);
      touch.removeEventListener('change', scheduleResize);
      cancelAnimationFrame(frame);
    };
  }, []);
  useEffect(() => {
    const end = (event) => gesture.current.end(event);
    const cancel = () => gesture.current.end();
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', cancel);
    };
  }, []);
  useEffect(() => {
    if (!playable) gesture.current.end();
  }, [playable]);
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
    } catch {}
    setPrefsLoaded(true);
    const params = new URLSearchParams(location.search);
    isolated.current = params.has('seed') || (import.meta.env.DEV && params.get('fixture') === 'mockup');
    persistence.current = isolated.current ? null : createPersistence({
      storage: () => localStorage, locks: navigator.locks,
    });
    let saved;
    try { saved = persistence.current?.load(); }
    catch { setScoresSaved(false); setSaveWarning(storageWarning()); }
    if (saved) {
      setHighScores(saved.scores);
      setBest(saved.scores[0]?.score || 0);
    }
    const seed = params.has('seed') ? Number(params.get('seed')) || 502
      : crypto.getRandomValues(new Uint32Array(1))[0];
    const game = saved?.game || {
      id: gameId(),
      state: import.meta.env.DEV && params.get('fixture') === 'mockup' ? fixture() : newGame(seed),
      path: [], focusId: 't0',
    };
    restoreGame(game);
    if (saved?.game) setMessage('Welcome back - your game has been restored.');
    if (saved?.damaged) setMessage('Your saved game could not be restored. Your high scores have been kept.');
    if (saved?.unsupported) {
      setScoresSaved(false);
      setSaveWarning('This saved game needs a newer version. Your existing save has been kept.');
    }
    setGameLoaded(true);
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
    const refreshScores = (event) => {
      if (isolated.current || (event.key !== SAVE_KEY && event.key !== null)) return;
      try {
        const saved = readSave(localStorage);
        setHighScores(saved.scores);
        setBest(saved.scores[0]?.score || 0);
      } catch {
        setScoresSaved(false);
        setSaveWarning(storageWarning());
      }
    };
    window.addEventListener('storage', refreshScores);
    return () => window.removeEventListener('storage', refreshScores);
  }, []);
  useEffect(() => {
    if (!gameLoaded || locked.current || !checkpoint.current) return;
    const game = { ...checkpoint.current, path, focusId };
    checkpoint.current = game;
    void persistGame(game);
  }, [path, focusId, gameLoaded]);
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
    audio.current?.setMusic(
      settings.music,
      settings.musicMute || settingsOpen || helpOpen || restartOpen || scoresOpen || moreOpen || fit.blocked,
    );
  }, [settings.music, settings.musicMute, settingsOpen, helpOpen, restartOpen, scoresOpen, moreOpen, fit.blocked]);
  function restoreGame(game) {
    setPhoneCelebration(null);
    checkpoint.current = game;
    runId.current = game.id;
    setRestoreEpoch(n => n + 1);
    setState(game.state);
    setDisplay(game.state.board);
    setScoreTarget(game.state.score);
    setPath(game.path);
    setFocusId(game.focusId);
    setFalls({});
    setActive([]);
    setPhase('PLAYER_INPUT');
  }
  async function persistGame(game) {
    if (!persistence.current) return true;
    const result = await persistence.current.save(game);
    if (!mounted.current) return false;
    setHighScores(result.scores);
    setBest(result.scores[0]?.score || 0);
    setScoresSaved(result.saved);
    setSaveWarning(result.unsupported
      ? 'This saved game needs a newer version. Your existing save has been kept.'
      : result.saved ? '' : storageWarning());
    if (result.conflict) {
      if (result.game) restoreGame(result.game);
      setMessage(result.game ? 'Your latest game from another tab has been restored. Please try again.'
        : 'The saved game changed in another tab. Please reload before continuing.');
      if (!result.game) setGameLoaded(false);
      return false;
    }
    return true;
  }
  useEffect(() => {
    audio.current?.setEffects(settings.sound, settings.soundMute);
  }, [settings.sound, settings.soundMute]);
  function startSound() {
    if (!audio.current) audio.current = new SoundKitchen(
      `${basePath}/assets/LosingHorn.m4a`,
      `${basePath}/assets/mmm-mm-good.wav`,
      `${basePath}/assets/SoupMedleyLoop.m4a`,
    );
    audio.current.setEffects(settings.sound, settings.soundMute);
    audio.current.start();
    audio.current.setMusic(
      settings.music,
      settings.musicMute || settingsOpen || helpOpen || restartOpen || scoresOpen || moreOpen || fit.blocked,
    );
  }
  function chime(kind) {
    audio.current?.play(kind);
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
    const game = { id: runId.current, state: result.state, path: [], focusId: result.state.board[0]?.id };
    if (!await persistGame(game)) {
      locked.current = false;
      setBusy(false);
      return { error: 'The latest saved game was restored. Please try again.' };
    }
    checkpoint.current = game;
    setPath([]);
    setTrapped(false);
    reactTo(result.actual || 3);
    if (type !== 'word') chime('tile');
    setScoreTarget(result.state.score);
    let previousBoard = display;
    for (const frame of result.frames) {
      if (!mounted.current) return;
      const nextFalls = tileFalls(previousBoard, frame.board);
      setFalls(nextFalls);
      previousBoard = frame.board;
      setDisplay(frame.board);
      setPhase(frame.phase);
      setActive(frame.active);
      setMessage(PHASE_TEXT[frame.phase]);
      const sound = phaseSound(frame, result, state.level);
      if (sound === 'level-up' && phoneActive.current && result.state.status !== 'game-over') {
        setPhoneCelebration({ level: result.state.level, turn: result.state.turnNumber });
      }
      if (frame.phase === 'GAME_OVER') setPhoneCelebration(null);
      if (sound) chime(sound);
      if (frame.phase === 'REFILL') {
        frame.active.forEach((id, index) => audio.current?.plop(
          settings.motion ? index * 0.012 : (nextFalls[id]?.delay ?? 0) / 1000,
        ));
      }
      await new Promise((r) =>
        setTimeout(
          r,
          settings.motion
            ? 35
            : frame.phase === 'SCORE_AND_REMOVE'
              ? 300
              : frame.phase === 'FIRE_DAMAGE'
                ? 420
                : Object.keys(nextFalls).length
                  ? 620
                  : 200,
        ),
      );
    }
    if (!mounted.current) return;
    setState(result.state);
    setDisplay(result.state.board);
    setFalls({});
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
    return {
      word: result.word,
      points: result.points,
      score: result.state.score,
      status: result.state.status,
      turn: result.state.turnNumber,
    };
  }
  async function reset() {
    if (locked.current || !gameLoaded) return;
    setPhoneCelebration(null);
    locked.current = true;
    setBusy(true);
    audio.current?.stopHorn();
    audio.current?.stopLevelUp();
    const s = newGame(Date.now());
    const game = { id: gameId(), state: s, path: [], focusId: 't0' };
    if (!await persistGame(game)) {
      locked.current = false;
      setBusy(false);
      setRestartOpen(false);
      return;
    }
    checkpoint.current = game;
    runId.current = game.id;
    locked.current = false;
    setBusy(false);
    setState(s);
    setDisplay(s.board);
    setFalls(tileFalls([], s.board));
    s.board.forEach((tile, index) => audio.current?.plop(index * 0.012));
    setScoreTarget(s.score);
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
    startSound();
    setSettingsOpen(false);
    focusControl(gearRef);
  };
  function focusControl(desktopRef) {
    requestAnimationFrame(() => (fit.phone ? moreRef : desktopRef).current?.focus({ preventScroll: true }));
  }
  function closeMore() {
    startSound();
    setMoreOpen(false);
    focusControl(gearRef);
  }
  function openFromMore(setOpen) {
    setMoreOpen(false);
    setOpen(true);
  }
  const phoneFeedback = !service
    ? loadError ? 'Dictionary unavailable. Reload to retry.' : 'Warming up the dictionary…'
    : state.status === 'game-over' ? `Soup’s over! ${state.score.toLocaleString()} points · More for New Game`
    : trapped ? 'No rescue word. Open More for New Game.'
    : word ? valid ? `✓ Valid word · ${preview.toLocaleString()} points` : word.length < 3 ? 'Keep going · 3 letters minimum' : 'Not in the dictionary'
    : hazards.bottom.length ? 'Clear bottom fire on your next move.'
    : message.startsWith('A fresh pot!') ? 'Connect 3 or more letters'
    : message.startsWith('Your latest game') ? 'Latest game restored · please try again'
    : message.startsWith('Your saved game could not') ? 'Game could not be restored · scores kept'
    : message.startsWith('No playable scramble') ? 'No scramble available · no turn spent'
    : message;
  useLayoutEffect(() => {
    const box = phoneFeedbackRef.current;
    if (!fit.phone || !box) return;
    const text = box.firstElementChild;
    const measure = () => {
      text.style.fontSize = '14px';
      text.style.fontSize = `${14 * Math.min(1, (box.clientWidth - 8) / Math.max(1, text.offsetWidth))}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    document.fonts.addEventListener('loadingdone', measure);
    return () => { observer.disconnect(); document.fonts.removeEventListener('loadingdone', measure); };
  }, [phoneFeedback, fit.phone]);
  return (
    <main
      ref={viewportRef}
      className={`kitchen ${settings.motion ? 'reduced-motion' : ''} ${settings.contrast ? 'high-contrast' : ''}`}
      style={{ '--asset-url': `url('${basePath}/assets/kitchen.png')` }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !settingsOpen && !helpOpen && !restartOpen && !scoresOpen && !moreOpen)
          setPath([]);
      }}
    >
      <SoupSteam />
      {saveWarning && <output className="progress-storage-warning">{saveWarning}</output>}
      <div
        ref={stageRef}
        className={`game-stage ${fit.phone ? 'phone-stage' : ''} ${fit.landscape ? 'phone-landscape' : ''} ${fit.blocked ? 'phone-blocked' : ''}`}
        style={{
          width: fit.width,
          transform: `scale(${fit.scale})`,
          '--tile': `${fit.phone ? fit.cellWidth : fit.compact ? Math.min(60, (fit.width - 86) / 7) : Math.min(90, (fit.width - 570) / 7)}px`,
          ...(fit.phone ? { height: fit.height, '--cellh': `${fit.cellHeight}px` } : {}),
        }}
      >
        <button ref={fit.blocked ? undefined : moreRef} className="phone-only phone-more" disabled={busy}
          aria-haspopup="dialog" aria-expanded={moreOpen}
          title={saveWarning || undefined}
          onClick={() => { startSound(); setMoreOpen(true); }}>More{saveWarning ? ' !' : ''}</button>
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
              <AnimatedScore key={restoreEpoch} score={scoreTarget} reducedMotion={settings.motion} audio={audio} />
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
              className="action brass scramble"
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
              className="action teal brass new-game"
              disabled={busy}
              onClick={() =>
                state.status === 'game-over' ? reset() : setRestartOpen(true)
              }
            >
              ♨ New Game
            </button>
            <p className="best">
              Best: {best ? best.toLocaleString() : 'None yet'} <span>·</span> Turn{' '}
              {state.turnNumber}
            </p>
          </aside>
          <section
            ref={boardRef}
            className={`board phase-${phase}`}
            aria-label="Letter board"
            aria-busy={busy}
            onPointerMove={(e) => {
              if (!gesture.current.owns(e) || !playable) return;
              const el = document
                .elementFromPoint(e.clientX, e.clientY)
                ?.closest('[data-tile]');
              const id = el?.getAttribute('data-tile');
              if (gesture.current.move(e, id)) select(id);
            }}
            onPointerUp={(e) => gesture.current.end(e)}
            onPointerCancel={(e) => gesture.current.end(e)}
            onLostPointerCapture={(e) => gesture.current.end(e)}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') {
                gesture.current.end(e);
              }
            }}
          >
            {Array.from({ length: 7 }, (_, c) => (
              <div
                key={c}
                className={`column brass col-${c}`}
                style={{
                  height: `calc(${CAPACITIES[c]} * (var(--cellh) + var(--row-gap, 3px)) + var(--column-extra, 5px))`,
                }}
              >
                {display
                  .filter((t) => t.column === c)
                  .map((t) => {
                    const index = path.indexOf(t.id);
                    const fall = falls[t.id];
                    return (
                      <button
                        key={t.id}
                        data-tile={t.id}
                        aria-label={`${t.letter}, column ${c + 1}, row ${t.row + 1}${t.isRed ? ', burning' : ''}${t.tier !== 'ordinary' ? `, ${t.tier} reward plus ${TIERS[t.tier].bonus}` : ''}${t.burnDamage ? `, ${t.burnDamage} fire damage` : ''}`}
                        aria-pressed={index >= 0}
                        tabIndex={focusId === t.id ? 0 : -1}
                        disabled={!playable}
                        onFocus={() => { if (playable) setFocusId(t.id); }}
                        onKeyDown={(e) => keyboard(e, t)}
                        onClick={(e) => {
                          if (e.detail === 0) select(t.id);
                        }}
                        onPointerDown={(e) => {
                          if (!playable || !gesture.current.begin(e, t.id)) return;
                          e.preventDefault();
                          e.currentTarget.focus({ preventScroll: true });
                          // Capture touch only; desktop keeps its existing leave-to-stop behavior.
                          if (e.pointerType !== 'mouse') boardRef.current.setPointerCapture(e.pointerId);
                          select(t.id);
                        }}
                        style={{
                          top: `calc(${t.row} * (var(--cellh) + var(--row-gap, 3px)) + var(--tile-top, 4px))`,
                          '--fall-rows': fall?.rows ?? 0,
                          '--fall-delay': `${fall?.delay ?? 0}ms`,
                          '--fall-tilt': `${fall?.tilt ?? 0}deg`,
                        }}
                        className={`tile ${fall ? 'tile-falling' : ''} ${t.tier} ${t.isRed ? 'red' : ''} ${t.isRed && t.row === CAPACITIES[c] - 1 ? 'deadline' : ''} ${index >= 0 ? 'selected' : ''} ${available.includes(t.id) && !path.includes(t.id) ? 'eligible' : ''} ${active.includes(t.id) ? 'phase-active' : ''} ${t.burnDamage ? 'damaged' : ''}`}
                      >
                        <span className="letter">{t.letter}</span>
                        {t.tier !== 'ordinary' && (
                          <span className="tier-symbol" aria-hidden="true">
                            {TIERS[t.tier].symbol}
                          </span>
                        )}
                        {t.isRed && (
                          <>
                            <Flame className="fire-symbol" aria-hidden="true" />
                          </>
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
                viewBox={fit.phone ? `0 0 ${7 * fit.cellWidth + 6} ${8 * (fit.cellHeight + 1) + 1}` : '0 0 700 800'}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polyline
                  points={selected
                    .map(
                      (t) => fit.phone
                        ? `${t.column * (fit.cellWidth + 1) + fit.cellWidth / 2},${yOf(t) * (fit.cellHeight + 1) + 1 + fit.cellHeight / 2}`
                        : `${t.column * 100 + 50},${(yOf(t) + 0.5) * 100}`,
                    )
                    .join(' ')}
                  fill="none"
                  stroke="#ffe9a3"
                  strokeWidth={fit.phone ? 3 : 5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <div className="board-steam" aria-hidden="true">
              {display.filter((t) => t.isRed).map((t) => (
                <div
                  key={t.id}
                  className={`steam-anchor ${falls[t.id] ? 'steam-falling' : ''} ${t.column % 2 === 0 ? 'staggered' : ''} ${active.includes(t.id) ? 'phase-active' : ''}`}
                  style={{
                    '--column': t.column,
                    '--row': t.row,
                    '--fall-rows': falls[t.id]?.rows ?? 0,
                    '--fall-delay': `${falls[t.id]?.delay ?? 0}ms`,
                    '--fall-tilt': `${falls[t.id]?.tilt ?? 0}deg`,
                    '--smoke-delay': `-${(Number(t.id.replace(/\D/g, '')) % 19) / 3}s`,
                  }}
                >
                  <span className="tile-smoke"><i /><i /></span>
                </div>
              ))}
            </div>
          </section>
          <output className="phone-only phone-storage-note" aria-live={fit.phone ? "polite" : "off"}>
            {saveWarning ? "Progress not saved · details in More" : ""}
          </output>
          <aside className="right-panel">
            <section className="word-panel brass">
              <h2 className="ribbon">Current Word</h2>
              <div
                className="spelling"
                ref={spellingRef}
                aria-live="polite"
              >
                <span className="spelling-text">{word || '—'}</span>
              </div>
              <p ref={phoneFeedbackRef} className={valid ? 'valid-note word-points' : ''} aria-live={fit.phone ? 'polite' : undefined}>
                {fit.phone ? <span key={`${word}:${phoneFeedback}`} className="phone-feedback-text">{phoneFeedback}</span> : !service ? (
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
                onClick={() => { startSound(); setPath([]); }}
                disabled={!playable || !path.length}
              >
                <Undo2 size={19} /> {fit.phone ? 'Clear' : 'Clear word'}
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
              <output className="phone-only phone-fire" aria-label={`Fire danger: ${hazards.bottom.length ? 'bottom fire must be cleared' : `${hazards.count} burning tiles`}`}>
                <Flame size={15} aria-hidden="true" />
                {hazards.bottom.length ? 'Bottom fire!' : `${hazards.count} burning`}
              </output>
            </section>
          </aside>
          <ScoreNote
            scores={highScores}
            open={scoresOpen}
            noteRef={scoreNoteRef}
            disabled={busy}
            onOpen={() => setScoresOpen(true)}
          />
          {fit.phone && !fit.blocked && phoneCelebration && (
            <PhoneCelebration key={phoneCelebration.turn} level={phoneCelebration.level}
              basePath={basePath} height={fit.height} />
          )}
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
        {fit.blocked && <div className="phone-space-message brass">
          <strong><output>{fit.landscape ? 'Turn your phone upright to continue' : 'A little more room, please'}</output></strong>
          <p>{fit.landscape ? 'Your game and word are safe.' : 'Hide browser controls or reduce browser zoom to fit the whole board.'}</p>
          <button ref={moreRef} className="action teal brass" onClick={() => setMoreOpen(true)}>More</button>
        </div>}
      </div>
      <Dialog open={moreOpen} onOpenChange={(open) => open ? setMoreOpen(true) : closeMore()}>
        <DialogContent centered={false} className="phone-menu phone-dialog brass" finalFocus={fit.phone ? moreRef : gearRef}>
          <DialogTitle>Alphabet Soup</DialogTitle>
          <DialogDescription>Your game is paused. Your word stays selected.</DialogDescription>
          <p>Best: {best ? best.toLocaleString() : 'None yet'} · Turn {state.turnNumber}</p>
          {saveWarning && <output>{saveWarning}</output>}
          <button className="action teal brass" onClick={() => openFromMore(setSettingsOpen)}>Settings</button>
          <button className="action teal brass" onClick={() => openFromMore(setHelpOpen)}>How to Play & Scoring</button>
          <button className="action teal brass" onClick={() => openFromMore(setScoresOpen)}>Top Of The Pot</button>
          <button className="action brass" onClick={() => openFromMore(setRestartOpen)}>New Game</button>
          <button className="action teal brass" onClick={closeMore}>Resume game</button>
        </DialogContent>
      </Dialog>
      <ScoreLeaderboard
        phone={fit.phone}
        returnFocusRef={fit.phone ? moreRef : scoreNoteRef}
        scores={highScores}
        open={scoresOpen}
        saved={scoresSaved}
        onOpenChange={(open) => {
          setScoresOpen(open);
          if (!open) { startSound(); focusControl(scoreNoteRef); }
        }}
      />
      <Dialog
        open={settingsOpen}
        onOpenChange={(v) => (v ? setSettingsOpen(true) : closeSettings())}
      >
        <DialogContent className={`settings-dialog brass ${fit.phone ? 'phone-dialog' : ''}`} finalFocus={fit.phone ? moreRef : gearRef}>
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
          if (!open) { startSound(); focusControl(helpRef); }
        }}
      >
        <DialogContent className={`settings-dialog brass ${fit.phone ? 'phone-dialog' : ''}`} finalFocus={fit.phone ? moreRef : helpRef}>
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
              startSound();
              focusControl(helpRef);
            }}
          >
            Resume game
          </button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={restartOpen} onOpenChange={(open) => {
        setRestartOpen(open);
        if (!open && fit.phone) { startSound(); focusControl(moreRef); }
      }}>
        <AlertDialogContent className={`restart-dialog brass ${fit.phone ? 'phone-dialog' : ''}`} finalFocus={fit.phone ? moreRef : undefined}>
          <AlertDialogTitle>Start a fresh pot?</AlertDialogTitle>
          <AlertDialogDescription>
            Start over from zero? Your current score of {state.score.toLocaleString()}
            {' '}stays in Top Of The Pot if it is one of your five best.
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
