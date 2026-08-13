"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Check, Dumbbell, Flame, Moon, Sparkles, Target, TrendingDown, TrendingUp, Trophy, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { AREA_LABELS } from "@/lib/defaults";
import { scoreColor, scoreLabel } from "@/lib/score";
import { addDays, fmtDuration, fmtShort, todayISO, weekdayOf } from "@/lib/date";
import { periodRecap, weekRange, monthRange, PeriodRecap } from "@/lib/recap";
import { Button } from "@/components/ui";

/* ---------------- Count-up hook ---------------- */

function useCountUp(target: number, play: boolean, ms = 900): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!play) return;
    if (target <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setV(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, play, ms]);
  return v;
}

/* ---------------- Animated ring ---------------- */

export function AnimatedRing({
  value,
  size = 200,
  stroke = 16,
  play,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  play: boolean;
  sublabel?: string;
}) {
  const gid = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const shown = useCountUp(value, play);
  const color = scoreColor(value);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={play ? { animation: "recapGlow 1.6s ease .3s" } : undefined}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--grad-a)" />
            <stop offset="1" stopColor="var(--grad-b)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={play ? c * (1 - pct) : c}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.3,.8,.3,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="num font-bold leading-none tracking-[-0.03em]" style={{ fontSize: size / 3.4 }}>
          {shown}
        </span>
        {sublabel && (
          <span className="mt-1 text-[13px] font-semibold" style={{ color }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------------- Daily check/cross list (used by the end-of-day flow) ---------------- */

export function RecapChecklist({
  builds,
  reduces,
  play,
}: {
  builds: { id: string; name: string; done: boolean }[];
  reduces: { id: string; name: string; slipped: boolean }[];
  play: boolean;
}) {
  const rows = [
    ...builds.map((b) => ({ id: b.id, name: b.name, ok: b.done })),
    ...reduces.map((r) => ({ id: "r-" + r.id, name: r.name, ok: !r.slipped })),
  ];
  if (rows.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => (
        <div
          key={row.id}
          className={play ? "recap-pop flex items-center gap-2.5" : "flex items-center gap-2.5 opacity-0"}
          style={play ? { animationDelay: `${300 + i * 70}ms` } : undefined}
        >
          <span
            className={`recap-icon flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              row.ok ? "bg-[var(--good)] text-white" : "bg-[var(--bad)]/15 text-[var(--bad)]"
            }`}
            style={play ? { animationDelay: `${360 + i * 70}ms` } : undefined}
          >
            {row.ok ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
          </span>
          <span className={`text-sm ${row.ok ? "" : "text-[var(--text-muted)]"}`}>{row.name}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Period recap overlay (week / month) ---------------- */

export function RecapOverlay({
  mode,
  refDate,
  onClose,
}: {
  mode: "week" | "month";
  refDate: string;
  onClose: () => void;
}) {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setPlay(true), 60);
    return () => clearTimeout(id);
  }, []);

  const { range, title } = useMemo(() => {
    if (mode === "week") {
      const r = weekRange(refDate);
      return { range: r, title: t("Weekly recap") };
    }
    const r = monthRange(refDate);
    return { range: r, title: t("Monthly recap") };
  }, [mode, refDate, t]);

  const rec: PeriodRecap = useMemo(() => periodRecap(data, d.byDate, range.start, range.end), [data, d.byDate, range]);

  const tiles = [
    { icon: Flame, label: t("Days logged"), value: `${rec.daysLogged}/${rec.totalDays}` },
    { icon: Trophy, label: t("Best day"), value: rec.bestDay ? `${rec.bestDay.score}` : "—", sub: rec.bestDay ? fmtShort(rec.bestDay.date) : undefined },
    { icon: Target, label: t("Habit completion"), value: `${rec.habitRate}%` },
    { icon: Dumbbell, label: t("Workouts"), value: String(rec.workouts) },
    { icon: Moon, label: t("Avg sleep"), value: rec.sleepAvgMin ? fmtDuration(rec.sleepAvgMin) : "—" },
    { icon: Sparkles, label: t("Top area"), value: rec.topArea ? t(AREA_LABELS[rec.topArea.key]) : "—", sub: rec.topArea ? `${rec.topArea.value}/100` : undefined },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-4">
      <div className="card relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto rounded-2xl text-center">
        <button onClick={onClose} className="absolute right-3 top-3 text-[var(--text-faint)] hover:text-[var(--text)]" aria-label="Close">
          <X size={18} />
        </button>

        <div className="px-2 pt-2">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">{title}</div>
          <div className="mt-0.5 text-sm text-[var(--text-muted)]">
            {fmtShort(range.start)} – {fmtShort(range.end)}
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center">
          <AnimatedRing value={rec.avgScore} play={play} sublabel={rec.avgScore > 0 ? t(scoreLabel(rec.avgScore)) : t("No data yet")} />
          <div className="mt-1 text-xs text-[var(--text-muted)]">{t("Average Life Score")}</div>
          {rec.trend !== 0 && (
            <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${rec.trend > 0 ? "bg-[var(--good)]/15 text-[var(--good)]" : "bg-[var(--bad)]/15 text-[var(--bad)]"}`}>
              {rec.trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {rec.trend > 0 ? "+" : ""}
              {rec.trend} {t("vs previous")}
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 px-1">
          {tiles.map((tile, i) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.label}
                className={play ? "recap-pop tile p-3 text-left" : "tile p-3 text-left opacity-0"}
                style={play ? { animationDelay: `${400 + i * 90}ms` } : undefined}
              >
                <div className="flex items-center gap-1.5 text-[var(--text-faint)]">
                  <Icon size={13} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.05em]">{tile.label}</span>
                </div>
                <div className="num mt-1 text-xl font-bold">{tile.value}</div>
                {tile.sub && <div className="text-[11px] text-[var(--text-muted)]">{tile.sub}</div>}
              </div>
            );
          })}
        </div>

        <div className="mt-5 px-1 pb-1">
          <Button className="w-full !py-3" onClick={onClose}>{t("Nice!")}</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Auto-trigger gate (weekly Sundays, monthly on the 1st) ---------------- */

export function RecapGate() {
  const { data, ready, updateSettings } = useStore();
  const df = data.settings.dayFlow;
  const [state, setState] = useState<{ decided: boolean; show: null | { mode: "week" | "month"; refDate: string } }>({
    decided: false,
    show: null,
  });

  useEffect(() => {
    if (!ready || state.decided || !data.settings.onboardingComplete || !df?.recapsEnabled) return;
    const today = todayISO();
    const monthKey = today.slice(0, 7);
    let show: { mode: "week" | "month"; refDate: string } | null = null;
    if (today.slice(8, 10) === "01" && df.lastMonthly !== monthKey) {
      // On the 1st, recap the month that just ended.
      show = { mode: "month", refDate: addDays(today, -1) };
    } else if (weekdayOf(today) === 0 && df.lastWeekly !== today) {
      show = { mode: "week", refDate: today };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ decided: true, show });
  }, [ready, state.decided, df, data.settings.onboardingComplete]);

  if (!state.show || !df) return null;

  const close = () => {
    if (state.show?.mode === "month") {
      updateSettings({ dayFlow: { ...df, lastMonthly: todayISO().slice(0, 7) } });
    } else {
      updateSettings({ dayFlow: { ...df, lastWeekly: todayISO() } });
    }
    setState({ decided: true, show: null });
  };

  return <RecapOverlay mode={state.show.mode} refDate={state.show.refDate} onClose={close} />;
}
