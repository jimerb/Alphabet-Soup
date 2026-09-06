'use client';
import { useEffect, useRef, useState } from 'react';

export default function AnimatedScore({ score, reducedMotion, audio }) {
  const [shown, setShown] = useState(score);
  const current = useRef(score);
  useEffect(() => {
    const from = current.current;
    if (score <= from || reducedMotion) {
      current.current = score;
      setShown(score);
      if (score > from) audio.current?.scoreTick(1);
      return;
    }
    let frame, started, lastTick = -1;
    const update = (now) => {
      started ??= now;
      const progress = Math.min(1, (now - started) / 760);
      const value = Math.round(from + (score - from) * (1 - (1 - progress) ** 3));
      current.current = value;
      setShown(value);
      const tick = Math.floor(progress * 7);
      if (tick !== lastTick) { audio.current?.scoreTick(progress); lastTick = tick; }
      if (progress < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [score, reducedMotion, audio]);
  return (
    <strong className={`score ${shown < score ? 'score-counting' : ''}`} aria-label={`Score ${score}`}>
      <span aria-hidden="true">{shown.toLocaleString()}</span>
    </strong>
  );
}
