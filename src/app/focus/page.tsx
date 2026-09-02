"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Check, Pause, Play, RotateCcw, Target, Timer, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { addDays, fmtDuration, todayISO, weekdayLabel, weekdayOf } from "@/lib/date";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  NumberInput,
  PageHeader,
  SectionTitle,
  StatTile,
  inputCls,
} from "@/components/ui";
import { Bars } from "@/components/charts";

const PRESETS = [25, 50, 90];

function fmtClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FocusPage() {
  const { data, addFocusSession, removeFocusSession, updateSettings } = useStore();
  const t = useT();
  const lang = data.settings.language;
  const target = data.settings.focusTargetMinutes || 120;

  const [sessionMin, setSessionMin] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState("");
  const finishedRef = useRef(false);

  // When the length changes while idle, reset the clock to match.
  useEffect(() => {
    if (!running) setSecondsLeft(sessionMin * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionMin]);

  // Tick once per second while running.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Auto-complete when the countdown reaches zero.
  useEffect(() => {
    if (running && secondsLeft === 0 && !finishedRef.current) {
      finishedRef.current = true;
      addFocusSession(sessionMin, label);
      notifyDone(sessionMin);
      setRunning(false);
      setSecondsLeft(sessionMin * 60);
      setLabel("");
    }
    if (secondsLeft > 0) finishedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);

  function notifyDone(min: number) {
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(t("Focus session done"), {
          body: t("Logged {min} min of focus. Nice work.", { min }),
          icon: "/icons/icon-192.png",
        });
      }
    } catch {
      /* ignore */
    }
  }

  function start() {
    if (secondsLeft === 0) setSecondsLeft(sessionMin * 60);
    setRunning(true);
  }
  function reset() {
    setRunning(false);
    setSecondsLeft(sessionMin * 60);
  }
  function stopAndLog() {
    const elapsed = Math.round((sessionMin * 60 - secondsLeft) / 60);
    if (elapsed >= 1) {
      addFocusSession(elapsed, label);
      setLabel("");
    }
    reset();
  }

  const today = todayISO();
  const sessions = data.focusSessions ?? [];

  const stats = useMemo(() => {
    const todayMin = sessions.filter((s) => s.date === today).reduce((a, s) => a + s.minutes, 0);
    const last7 = new Set<string>();
    for (let i = 0; i < 7; i++) last7.add(addDays(today, -i));
    const weekMin = sessions.filter((s) => last7.has(s.date)).reduce((a, s) => a + s.minutes, 0);

    // Days with any focus, most recent first → current streak.
    const byDay = new Set(sessions.map((s) => s.date));
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const d = addDays(today, -i);
      if (byDay.has(d)) streak++;
      else if (i === 0) continue; // today not logged yet doesn't break a prior streak
      else break;
    }

    const bars = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, -(6 - i));
      const min = sessions.filter((s) => s.date === d).reduce((a, s) => a + s.minutes, 0);
      return { label: weekdayLabel(weekdayOf(d), false).slice(0, 2), value: min };
    });

    return { todayMin, weekMin, streak, bars };
  }, [sessions, today]);

  const recent = useMemo(
    () => [...sessions].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)).slice(0, 12),
    [sessions],
  );

  const pct = Math.min(100, Math.round((stats.todayMin / target) * 100));
  const isCustom = !PRESETS.includes(sessionMin);

  return (
    <div>
      <PageHeader kicker={t("Deep work")} title={t("Focus")} subtitle={t("Deep-work sessions that fuel your score")} />

      {/* Timer */}
      <Card className="mb-4">
        <SectionTitle right={<Timer size={16} className="text-[var(--text-faint)]" />}>{t("Timer")}</SectionTitle>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {PRESETS.map((m) => (
            <Chip key={m} active={sessionMin === m && !running} onClick={() => !running && setSessionMin(m)}>
              {m} {t("min")}
            </Chip>
          ))}
          <div className="flex items-center gap-1.5">
            <NumberInput
              value={isCustom ? sessionMin : undefined}
              onChange={(n) => !running && n != null && n > 0 && setSessionMin(Math.min(600, Math.round(n)))}
              placeholder={t("Custom")}
              disabled={running}
              className={`${inputCls} w-24`}
              min={1}
            />
            <span className="text-sm text-[var(--text-faint)]">{t("min")}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="num text-[64px] font-bold leading-none tracking-[-0.03em] tabular-nums">
            {fmtClock(secondsLeft)}
          </div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("What are you working on?")}
            className={`${inputCls} max-w-sm text-center`}
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!running ? (
              <Button onClick={start}>
                <Play size={16} /> {secondsLeft < sessionMin * 60 ? t("Resume") : t("Start")}
              </Button>
            ) : (
              <Button variant="soft" onClick={() => setRunning(false)}>
                <Pause size={16} /> {t("Pause")}
              </Button>
            )}
            <Button variant="outline" onClick={stopAndLog} disabled={secondsLeft === sessionMin * 60}>
              <Check size={16} /> {t("Stop & log")}
            </Button>
            <Button variant="ghost" onClick={reset} aria-label={t("Reset")}>
              <RotateCcw size={16} />
            </Button>
          </div>
          <p className="text-xs text-[var(--text-faint)]">
            {t("Finishing the timer logs the full session; “Stop & log” saves the time you did.")}
          </p>
        </div>
      </Card>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={<Brain size={15} />}
          label={t("Today")}
          value={fmtDuration(stats.todayMin)}
          sub={`${pct}% ${t("of target")}`}
        />
        <StatTile icon={<Timer size={15} />} label={t("This week")} value={fmtDuration(stats.weekMin)} />
        <StatTile icon={<Target size={15} />} label={t("Focus streak")} value={`${stats.streak}`} sub={t("days")} />
        <div className="tile flex flex-col gap-2 p-[16px] sm:px-[18px]">
          <div className="flex items-center gap-[7px] text-[var(--text-faint)]">
            <Target size={15} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em]">{t("Daily target")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <NumberInput
              value={target}
              onChange={(n) => n != null && n > 0 && updateSettings({ focusTargetMinutes: Math.round(n) })}
              className={`${inputCls} w-20`}
              min={15}
            />
            <span className="text-sm text-[var(--text-faint)]">{t("min")}</span>
          </div>
        </div>
      </div>

      {/* Week chart */}
      <Card className="mb-4">
        <SectionTitle>{t("Focus this week")}</SectionTitle>
        <Bars data={stats.bars} unit=" min" height={180} />
      </Card>

      {/* Recent */}
      <Card>
        <SectionTitle>{t("Recent sessions")}</SectionTitle>
        {recent.length === 0 ? (
          <EmptyState icon={<Timer size={22} />} title={t("No focus sessions yet")} hint={t("Run the timer above to log your first Deep-Work block.")} />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {recent.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Brain size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{s.label || t("Deep work")}</div>
                  <div className="text-xs text-[var(--text-faint)]">
                    {new Date(s.startedAt).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { weekday: "short", day: "numeric", month: "short" })}
                    {" · "}
                    {new Date(s.startedAt).toLocaleTimeString(lang === "de" ? "de-DE" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums">{fmtDuration(s.minutes)}</span>
                <button
                  onClick={() => removeFocusSession(s.id)}
                  className="rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--bad)]"
                  aria-label={t("Delete")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
