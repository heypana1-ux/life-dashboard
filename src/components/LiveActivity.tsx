"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Brain, ChevronRight, Dumbbell, Pause } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { elapsedSec, fmtClock, remainingSec, useLive } from "@/lib/liveActivity";
import { WorkoutRunner } from "@/components/WorkoutRunner";

/*
  The "live activity" layer, mounted once by the app shell.

  It owns three things that must outlive any single page: the floating bar that brings you
  back to a running session, the full-screen workout runner, and the completion of a focus
  countdown (which has to happen even if the Focus page isn't open — or wasn't open for the
  last two hours).
*/

/** True when a live session should shift the page content down to make room for the bar. */
export function useLiveBarVisible(): boolean {
  const { live, ready } = useLive();
  const pathname = usePathname();
  if (!ready || !live) return false;
  if (live.kind === "workout") return !!live.minimized;
  return !pathname.startsWith("/focus");
}

export function LiveActivityHost() {
  return (
    <>
      <FocusCompleter />
      <LiveBar />
      <WorkoutRunner />
    </>
  );
}

/**
 * Logs a focus block the moment its countdown is up — including when you come back to a
 * closed app long after it finished, because the elapsed time is derived from the clock.
 */
function FocusCompleter() {
  const { live, now, stop } = useLive();
  const { addFocusSession } = useStore();
  const t = useT();
  // Keyed on the session's start so a session can never be logged twice.
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!live || live.kind !== "focus" || live.totalSec == null) return;
    if (elapsedSec(live, now) < live.totalSec) return;
    if (done.current === live.startedAt) return;
    done.current = live.startedAt;

    const min = Math.round(live.totalSec / 60);
    addFocusSession(min, live.label);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(t("Focus session done"), {
          body: t("Logged {min} min of focus. Nice work.", { min }),
          icon: "/icons/icon-192.png",
        });
      }
    } catch {
      /* notifications are best-effort */
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([120, 80, 120]);
    stop();
  }, [live, now, addFocusSession, stop, t]);

  return null;
}

/**
 * Apple-style floating pill: never in the way, always one tap from the session. It appears
 * when the session's own screen isn't on top — a minimized workout, or a focus block while
 * you're somewhere else in the app.
 */
function LiveBar() {
  const { live, now, patch } = useLive();
  const visible = useLiveBarVisible();
  const router = useRouter();
  const t = useT();

  if (!live || !visible) return null;

  const isWorkout = live.kind === "workout";
  const paused = !live.runningSince;
  // A workout counts up; a focus block counts down to zero.
  const clock = fmtClock(live.totalSec != null ? remainingSec(live, now) : elapsedSec(live, now));
  const title = live.label || (isWorkout ? t("Workout") : t("Focus"));
  const Icon = isWorkout ? Dumbbell : Brain;

  function open() {
    if (!isWorkout) {
      router.push("/focus");
      return;
    }
    patch({ minimized: false });
    // A session clocked from the log form is restored by the Training page, not by the
    // full-screen runner, so it needs the route as well.
    if ((live?.payload as { mode?: string } | undefined)?.mode === "form") router.push("/training");
  }

  return (
    <div
      // The wrapper spans the width but ignores pointer events, so only the pill itself is
      // tappable and the page underneath stays fully usable.
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-3"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
      data-area={isWorkout ? "training" : "focus"}
    >
      <button
        onClick={open}
        aria-label={t("Back to your session")}
        className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 py-[7px] pl-3 pr-2.5 backdrop-blur-lg transition active:scale-[.98]"
        style={{
          boxShadow:
            "0 6px 22px color-mix(in srgb, var(--area-a) 26%, transparent), 0 2px 8px rgba(0,0,0,0.16)",
        }}
      >
        {paused ? (
          <Pause size={12} className="shrink-0 text-[var(--text-faint)]" />
        ) : (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="area-grad absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" />
            <span className="area-grad relative inline-flex h-2 w-2 rounded-full" />
          </span>
        )}
        <Icon size={14} className="area-text shrink-0" />
        <span className="truncate text-[12px] font-semibold">{title}</span>
        <span className="num shrink-0 text-[13px] font-bold tabular-nums">{clock}</span>
        <ChevronRight size={14} className="shrink-0 text-[var(--text-faint)]" />
      </button>
    </div>
  );
}
