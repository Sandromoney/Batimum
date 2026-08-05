"use client";

import { useCallback, useEffect, useRef } from "react";

type Pending = {
  id: ReturnType<typeof setTimeout> | null;
  fn: () => void;
  remaining: number;
  startedAt: number;
};

type IntervalEntry = {
  id: ReturnType<typeof setInterval> | null;
  fn: () => void;
  ms: number;
};

/**
 * Timers pauseables pour les films de démo.
 * Pause = fige le temps restant ; reprise = repart exactement.
 */
export function usePauseableTimers(paused: boolean) {
  const pausedRef = useRef(paused);
  const timersRef = useRef<Pending[]>([]);
  const intervalsRef = useRef<IntervalEntry[]>([]);

  const clear = useCallback(() => {
    timersRef.current.forEach((t) => {
      if (t.id != null) clearTimeout(t.id);
    });
    timersRef.current = [];
    intervalsRef.current.forEach((i) => {
      if (i.id != null) clearInterval(i.id);
    });
    intervalsRef.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const entry: Pending = {
      id: null,
      fn,
      remaining: Math.max(0, ms),
      startedAt: performance.now(),
    };
    if (pausedRef.current) {
      timersRef.current.push(entry);
      return;
    }
    entry.id = setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== entry);
      fn();
    }, entry.remaining);
    timersRef.current.push(entry);
  }, []);

  const every = useCallback((fn: () => void, ms: number) => {
    const entry: IntervalEntry = { id: null, fn, ms };
    if (!pausedRef.current) {
      entry.id = setInterval(fn, ms);
    }
    intervalsRef.current.push(entry);
  }, []);

  useEffect(() => {
    const was = pausedRef.current;
    pausedRef.current = paused;

    if (paused && !was) {
      const now = performance.now();
      timersRef.current.forEach((t) => {
        if (t.id != null) {
          clearTimeout(t.id);
          t.id = null;
          t.remaining = Math.max(0, t.remaining - (now - t.startedAt));
        }
      });
      intervalsRef.current.forEach((i) => {
        if (i.id != null) {
          clearInterval(i.id);
          i.id = null;
        }
      });
    } else if (!paused && was) {
      const now = performance.now();
      timersRef.current.forEach((t) => {
        t.startedAt = now;
        t.id = setTimeout(() => {
          timersRef.current = timersRef.current.filter((x) => x !== t);
          t.fn();
        }, t.remaining);
      });
      intervalsRef.current.forEach((i) => {
        if (i.id == null) i.id = setInterval(i.fn, i.ms);
      });
    }
  }, [paused]);

  useEffect(() => () => clear(), [clear]);

  return { later, every, clear };
}

/** Applique les cues déjà passés, planifie le reste + finish. */
export function runCueTimeline(opts: {
  cues: { at: number; apply: () => void }[];
  finishAt: number;
  seekMs: number;
  later: (fn: () => void, ms: number) => void;
  onFinish: () => void;
}) {
  const { cues, finishAt, seekMs, later, onFinish } = opts;
  let lastApplied = -1;
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].at <= seekMs) {
      cues[i].apply();
      lastApplied = i;
    }
  }
  for (let i = lastApplied + 1; i < cues.length; i++) {
    later(cues[i].apply, cues[i].at - seekMs);
  }
  if (finishAt <= seekMs) later(onFinish, 16);
  else later(onFinish, finishAt - seekMs);
}
