"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/*
  Live activities — a workout or a focus block that keeps running while you're on another
  page, swipe the app away, or close it entirely.

  The trick is that nothing counts seconds. A session records *when* it started running and
  how much time was banked before the last pause; the elapsed time is always derived from the
  clock. The one-second interval exists purely to re-render, so a throttled background tab, a
  locked phone or a fully closed app can't make the timer drift or lose the session.

  This lives in its own localStorage key rather than the synced app blob on purpose: a running
  session belongs to *this* device. Syncing it would start a phantom timer on your laptop.
*/

const LIVE_KEY = "life-dashboard:live";

export type LiveKind = "workout" | "focus";

export interface LiveSession {
  kind: LiveKind;
  /** ISO timestamp of the very first start. Also the identity of this session. */
  startedAt: string;
  /** Epoch ms when the current running segment began. Undefined while paused. */
  runningSince?: number;
  /** Seconds banked by earlier segments (everything before the last pause). */
  bankedSec: number;
  /** Countdown length in seconds. Absent for open-ended sessions like a workout. */
  totalSec?: number;
  /** What the floating bar shows next to the clock. */
  label?: string;
  /** True while the full-screen UI is dismissed but the session runs on. */
  minimized?: boolean;
  /** Kind-specific state, so the screen restores exactly where you left it. */
  payload?: Record<string, unknown>;
}

/** Seconds this session has run, derived from the clock — never from a counter. */
export function elapsedSec(s: LiveSession, now = Date.now()): number {
  const running = s.runningSince ? Math.max(0, Math.floor((now - s.runningSince) / 1000)) : 0;
  return s.bankedSec + running;
}

/** Seconds left on a countdown session (0 for open-ended ones). */
export function remainingSec(s: LiveSession, now = Date.now()): number {
  return s.totalSec == null ? 0 : Math.max(0, s.totalSec - elapsedSec(s, now));
}

/** mm:ss, or h:mm:ss once a session passes the hour. */
export function fmtClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function read(): LiveSession | null {
  try {
    const raw = localStorage.getItem(LIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveSession;
    if (!parsed || (parsed.kind !== "workout" && parsed.kind !== "focus")) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface LiveCtx {
  live: LiveSession | null;
  /** False until localStorage has been read (avoids an SSR/client mismatch). */
  ready: boolean;
  /** Epoch ms, refreshed every second while a session runs. Read this to render a live clock. */
  now: number;
  start: (s: Omit<LiveSession, "startedAt" | "bankedSec">) => void;
  patch: (p: Partial<LiveSession>) => void;
  /** Shallow-merge into the session's payload. */
  patchPayload: (p: Record<string, unknown>) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const Ctx = createContext<LiveCtx | null>(null);

export function LiveActivityProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<LiveSession | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLive(read());
    setNow(Date.now());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Another tab started, changed or ended a session.
    const onStorage = (e: StorageEvent) => {
      if (e.key === LIVE_KEY) setLive(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      if (live) localStorage.setItem(LIVE_KEY, JSON.stringify(live));
      else localStorage.removeItem(LIVE_KEY);
    } catch {
      /* ignore quota errors */
    }
  }, [live, ready]);

  // Heartbeat, only while something is actually running. Browsers throttle timers in a hidden
  // tab, so also resync the moment the app comes back into view.
  const running = live?.runningSince;
  useEffect(() => {
    if (!running) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    const onVis = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [running]);

  const start = useCallback((s: Omit<LiveSession, "startedAt" | "bankedSec">) => {
    setLive({ ...s, startedAt: new Date().toISOString(), bankedSec: 0, runningSince: s.runningSince ?? Date.now() });
  }, []);

  const patch = useCallback((p: Partial<LiveSession>) => {
    setLive((cur) => (cur ? { ...cur, ...p } : cur));
  }, []);

  const patchPayload = useCallback((p: Record<string, unknown>) => {
    setLive((cur) => (cur ? { ...cur, payload: { ...(cur.payload ?? {}), ...p } } : cur));
  }, []);

  const pause = useCallback(() => {
    setLive((cur) =>
      cur && cur.runningSince ? { ...cur, bankedSec: elapsedSec(cur), runningSince: undefined } : cur,
    );
  }, []);

  const resume = useCallback(() => {
    setLive((cur) => (cur && !cur.runningSince ? { ...cur, runningSince: Date.now() } : cur));
  }, []);

  const stop = useCallback(() => setLive(null), []);

  const value = useMemo<LiveCtx>(
    () => ({ live, ready, now, start, patch, patchPayload, pause, resume, stop }),
    [live, ready, now, start, patch, patchPayload, pause, resume, stop],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive(): LiveCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLive must be used inside <LiveActivityProvider>");
  return ctx;
}
