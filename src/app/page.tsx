"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Dumbbell,
  FolderKanban,
  HeartPulse,
  Lightbulb,
  Target,
  User,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived, useTodayComputation } from "@/lib/useDerived";
import { habitsForToday } from "@/lib/habitView";
import { activityStreak } from "@/lib/streak";
import { addDays, isoRange, todayISO, weekdayLabel, weekdayOf, monthLabel, parseISO } from "@/lib/date";
import { useT } from "@/lib/i18n";
import { AnimatedNumber, Delta } from "@/components/ui";
import { BOARD_COLUMNS } from "@/app/projects/page";

/* ------------------------------------------------------------------ *
 *  Dashboard — "Pulse 4a".
 *  Score ring + week strip + hairline stats, six area tiles, an up-next
 *  list and one coach hint. Everything the old dashboard carried on top
 *  of this lives in src/app/_legacy/DashboardClassic.tsx.
 * ------------------------------------------------------------------ */

/** The six tiles of the 4a design, each with its own colour pair from the Pulse palette. */
interface AreaTile {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** [light-theme stop, dark-theme stop] — the tile paints with the current theme's stop. */
  color: string;
  score: number;
}

export default function DashboardPage() {
  const { data } = useStore();
  const d = useDerived();
  const todayComp = useTodayComputation();
  const t = useT();

  const today = todayISO();
  const name = data.settings.profile.displayName || data.settings.profile.name || "";
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  /* ---- Life score + week ---- */
  const liveScore = todayComp.lifeScore ?? 0;
  const byDate = d.byDate;

  // This week vs last week, so "+4 vs. last week" is a real comparison.
  const vsLastWeek = useMemo(() => {
    const mean = (dates: string[]) => {
      const xs = dates.map((x) => byDate.get(x)?.lifeScore ?? 0).filter((n) => n > 0);
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    };
    const thisWeek = mean(isoRange(today, 7));
    const lastWeek = mean(isoRange(addDays(today, -7), 7));
    if (thisWeek === 0 || lastWeek === 0) return null;
    return Math.round(thisWeek - lastWeek);
  }, [byDate, today]);

  // Last seven days, oldest first — the little bar strip under the ring.
  const week = useMemo(
    () =>
      isoRange(today, 7).map((date) => ({
        date,
        score: byDate.get(date)?.lifeScore ?? 0,
        label: weekdayLabel(weekdayOf(date)),
        isToday: date === today,
      })),
    [byDate, today],
  );

  /* ---- Hairline stats ---- */
  const streak = activityStreak(d.history, data.settings);
  const goals = habitsForToday(data, today);
  const buildGoals = goals.filter((g) => g.habit.kind === "build");
  const doneCount = buildGoals.filter((g) => g.log?.done).length;
  const goalsPct = buildGoals.length > 0 ? Math.round((doneCount / buildGoals.length) * 100) : 0;
  const checkins = useMemo(() => {
    const win = isoRange(today, 7);
    const set = new Set(data.reviews.map((r) => r.date));
    return win.filter((x) => set.has(x)).length;
  }, [data.reviews, today]);

  /* ---- Six area tiles ---- */
  const tiles = useMemo<AreaTile[]>(() => {
    const cat = todayComp.categories;

    // Projects: how far the boards have moved, averaged across every open project.
    const projects = data.projects ?? [];
    const projectPct = projects.length
      ? Math.round(
          (projects.reduce((sum, p) => {
            const cols = BOARD_COLUMNS[p.board].length;
            return sum + Math.min(p.column, cols - 1) / (cols - 1);
          }, 0) /
            projects.length) *
            100,
        )
      : 0;

    // Journal: share of the last 30 days with an entry.
    const win30 = isoRange(today, 30);
    const journalDays = new Set(data.journal.map((j) => j.date));
    const journalPct = Math.round((win30.filter((x) => journalDays.has(x)).length / 30) * 100);

    // Goals: average progress of the goals still running.
    const open = (data.goals ?? []).filter((g) => !g.archived);
    const goalPct = open.length
      ? Math.round(open.reduce((s, g) => s + Math.max(0, Math.min(100, g.progress)), 0) / open.length)
      : 0;

    return [
      { key: "health", label: t("Health"), href: "/health", icon: HeartPulse, color: "var(--tile-health)", score: Math.round(cat.health ?? 0) },
      { key: "training", label: t("Training"), href: "/training", icon: Dumbbell, color: "var(--tile-training)", score: Math.round(cat.sport ?? 0) },
      { key: "finances", label: t("Finances"), href: "/finances", icon: Wallet, color: "var(--tile-finances)", score: Math.round(cat.finances ?? 0) },
      { key: "projects", label: t("Projects"), href: "/projects", icon: FolderKanban, color: "var(--tile-projects)", score: projectPct },
      { key: "journal", label: t("Journal"), href: "/journal", icon: BookOpen, color: "var(--tile-journal)", score: journalPct },
      { key: "goals", label: t("Goals"), href: "/goals", icon: Target, color: "var(--tile-goals)", score: goalPct },
    ];
  }, [todayComp.categories, data.projects, data.journal, data.goals, today, t]);

  /* ---- Up next today ---- */
  const upNext = useMemo(() => {
    const out: { id: string; title: string; meta: string; action: string; href: string; color: string; icon: LucideIcon }[] = [];

    const openGoal = buildGoals.find((g) => !g.log?.done);
    if (openGoal) {
      const h = openGoal.habit;
      const bits: string[] = [];
      if (h.targetMinutes) bits.push(`${h.targetMinutes} ${t("min")}`);
      if (h.timesPerDay) bits.push(`${h.timesPerDay}×`);
      out.push({
        id: h.id,
        title: h.name,
        meta: bits.length ? bits.join(" · ") : t("Open"),
        action: t("Start"),
        href: "/today",
        color: "var(--tile-training)",
        icon: Dumbbell,
      });
    }

    if (!data.journal.some((j) => j.date === today)) {
      out.push({
        id: "journal",
        title: t("Journal entry"),
        meta: t("Not written yet"),
        action: t("Open"),
        href: "/journal",
        color: "var(--tile-journal)",
        icon: BookOpen,
      });
    }

    if (!data.reviews.some((r) => r.date === today)) {
      out.push({
        id: "checkin",
        title: t("Daily check-in"),
        meta: t("Still open · counts toward the score"),
        action: t("Rate"),
        href: "/today",
        color: "var(--tile-projects)",
        icon: Target,
      });
    }
    return out;
  }, [buildGoals, data.journal, data.reviews, today, t]);

  /* ---- Coach hint: the area furthest below the rest ---- */
  const hint = useMemo(() => {
    const scored = tiles.filter((x) => x.score > 0);
    if (scored.length < 3) return null;
    const avg = scored.reduce((s, x) => s + x.score, 0) / scored.length;
    const worst = scored.reduce((a, b) => (a.score < b.score ? a : b));
    if (worst.score >= avg - 10) return null;
    return worst;
  }, [tiles]);

  const dateKicker = `${t(weekdayLabel(weekdayOf(today)))} · ${t(monthLabel(parseISO(today).getMonth()))} ${parseISO(today).getDate()}`;

  return (
    <div className="pt-[22px]">
      {/* ---------- Header ---------- */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="kicker truncate">{dateKicker}</div>
          <h1 className="mt-1.5 whitespace-nowrap text-[27px] font-semibold leading-[1.1] tracking-[-0.03em]">
            <span className="area-title">{t("Dashboard")}</span>
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <Link
            href="/settings#reminders"
            aria-label={t("Reminders")}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition hover:border-[var(--area-a)] hover:text-[var(--area-a)]"
          >
            <Bell size={16} />
          </Link>
          <Link
            href="/profile"
            aria-label={t("Profile")}
            className="area-grad flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-full text-[13px] font-bold"
          >
            {data.settings.profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.settings.profile.avatar} alt="" className="h-full w-full object-cover" />
            ) : name ? (
              initial
            ) : (
              <User size={16} />
            )}
          </Link>
        </div>
      </div>

      {/* ---------- Life score ---------- */}
      <div className="mt-[22px]">
        <div className="slabel">{t("Life Score")}</div>
        <div className="mt-3 flex items-center gap-[18px]">
          <ScoreRing value={liveScore} />
          {vsLastWeek !== null && (
            <span className="flex items-center gap-1.5">
              <Delta value={vsLastWeek as number} />
              <span className="text-[12.5px] text-[var(--text-faint)]">{t("vs. last week")}</span>
            </span>
          )}
        </div>

        {/* Week strip — height AND colour carry the day's score, so a weak day reads dark
            and a strong one saturated. Today keeps the full-strength gradient. */}
        {/* No fixed height: the columns (bar + label) are taller than a 52px band and would
            overflow upward into the ring. Bottom-aligned, they size to their own content. */}
        <div className="mt-7 flex items-end justify-between gap-[7px]">
          {week.map((w) => {
            // Real life scores cluster between ~30 and ~90, so a flat 0..100 ramp makes every
            // day look alike. Stretch that band across the full height and colour range instead.
            const f = Math.max(0, Math.min(1, (w.score - 30) / 60));
            const h = w.score > 0 ? 24 + Math.round(f * 26) : 24;
            const k = 26 + Math.round(f * 74);
            return (
              <div key={w.date} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className="w-full rounded-[9px]"
                  title={w.score > 0 ? `${t(w.label)} · ${w.score}` : t(w.label)}
                  style={{
                    height: h,
                    background:
                      w.score === 0
                        ? "var(--surface-2)"
                        : w.isToday
                          ? "linear-gradient(180deg, var(--area-b) 0%, var(--area-a) 65%, color-mix(in srgb, var(--area-a) 82%, var(--surface-2)) 100%)"
                          : `linear-gradient(180deg, color-mix(in srgb, var(--area-b) ${k}%, var(--surface-2)) 0%, color-mix(in srgb, var(--area-a) ${k}%, var(--surface-2)) 65%, color-mix(in srgb, var(--area-a) ${Math.round(k * 0.82)}%, var(--surface-2)) 100%)`,
                    boxShadow: w.isToday
                      ? "0 6px 16px color-mix(in srgb, var(--area-a) 35%, transparent)"
                      : undefined,
                  }}
                />
                <span
                  className={`text-[10px] ${w.isToday ? "area-text font-semibold" : "text-[var(--text-dim)]"}`}
                >
                  {t(w.label).slice(0, w.isToday ? 3 : 2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hairline stats */}
        <div className="mt-[18px] grid grid-cols-3 border-y border-[var(--surface-2)]">
          <StatCell label={t("Streak")} value={<><AnimatedNumber value={streak} /> <span className="text-[14px] font-semibold text-[var(--text-muted)]">d</span></>} first />
          <StatCell label={t("Goals")} value={`${goalsPct}%`} />
          <StatCell label={t("Check-ins")} value={`${checkins}/7`} last />
        </div>
      </div>

      {/* ---------- Areas ---------- */}
      <div className="mt-[22px]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="slabel">{t("Areas")}</h2>
          <Link href="/wheel" className="area-text text-[11.5px] font-semibold">
            {t("Wheel of life")} →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {tiles.map((tile) => (
            <AreaCard key={tile.key} tile={tile} />
          ))}
        </div>
      </div>

      {/* ---------- Up next today ---------- */}
      {upNext.length > 0 && (
        <div className="mt-[22px]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="slabel">{t("Up next today")}</h2>
            <span className="text-[11px] text-[var(--text-dim)]">
              {t("{n} open", { n: upNext.length })}
            </span>
          </div>
          <div className="flex flex-col">
            {upNext.map((row) => (
              <Link
                key={row.id}
                href={row.href}
                className="flex items-center gap-3 border-b border-[var(--surface-2)] py-[11px] last:border-0"
              >
                <span
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px]"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in srgb, ${row.color} 30%, transparent), color-mix(in srgb, ${row.color} 7%, transparent))`,
                    color: row.color,
                  }}
                >
                  <row.icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{row.title}</div>
                  <div className="truncate text-[11px] text-[var(--text-faint)]">{row.meta}</div>
                </div>
                <span className="shrink-0 text-[12px] font-semibold" style={{ color: row.color }}>
                  {row.action}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Coach hint ---------- */}
      {hint && (
        <Link
          href="/analysis"
          className="area-deep mt-[22px] flex items-center gap-3 rounded-[18px] border border-[color-mix(in_srgb,var(--area-a)_22%,transparent)] px-4 py-3.5"
        >
          <span className="area-soft flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px]">
            <Lightbulb size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">
              {t("{area} is pulling the score down", { area: hint.label })}
            </div>
            <p className="mt-0.5 text-[11.5px] leading-[1.45] text-[var(--text-muted)]">
              {t("It sits at {n} while your other areas average higher. See what moves it.", { n: hint.score })}
            </p>
          </div>
          <ChevronRight size={17} className="shrink-0 text-[var(--text-dim)]" />
        </Link>
      )}
    </div>
  );
}

/** The 4a score ring: 100px, 7px stroke, big number with "of 100" beneath it.
 *
 *  The stroke and the halo behind it read `--ring-grad-*` / `--ring-glow`, which the reward
 *  shop's ring skins set on <html> via `data-ring`. Those are deliberately separate from the
 *  accent tokens, so a bought skin (Ember, Prism, Gold …) paints the ring on its own while the
 *  rest of the app stays in your system colour. With no skin chosen the vars are unset and the
 *  fallbacks put it back on the page accent. */
function ScoreRing({ value }: { value: number }) {
  const t = useT();
  const size = 100;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const a = "var(--ring-grad-a, var(--area-a))";
  const b = "var(--ring-grad-b, var(--area-b))";
  // Skins ship their own glow; without one, derive it from the ring's own first stop.
  const glow = `var(--ring-glow, color-mix(in srgb, ${a} 45%, transparent))`;
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      {/* Halo — a soft bloom of the ring's own colour behind the arc.
          Done with box-shadow on a circle rather than a blurred radial-gradient: a gradient
          painted inside a square box leaves faint straight edges where the box ends, which is
          exactly what you notice on a dark background. A shadow spreads from the shape itself,
          so it can only ever be round. */}
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: "14%",
          boxShadow: `0 0 22px 10px ${glow}, 0 0 46px 18px ${glow}`,
          opacity: 0.75,
        }}
      />
      <svg width={size} height={size} className="relative -rotate-90">
        <defs>
          <linearGradient id="dashRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: a }} />
            <stop offset="1" style={{ stopColor: b }} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#dashRing)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(.3,.8,.3,1)",
            filter: `drop-shadow(0 0 6px ${glow})`,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="num text-[30px] font-bold leading-none tracking-[-0.03em]">
          <AnimatedNumber value={value} />
        </span>
        <span className="mt-[3px] text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">
          {t("of 100")}
        </span>
      </div>
    </div>
  );
}

/** One cell of the hairline stat strip under the week. */
function StatCell({
  label,
  value,
  first,
  last,
}: {
  label: string;
  value: React.ReactNode;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`py-3 ${first ? "pr-3" : last ? "pl-3" : "px-3"} ${last ? "" : "border-r border-[var(--surface-2)]"}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--text-faint)]">
        {label}
      </div>
      <div className="num mt-1 text-[20px] font-bold tracking-[-0.03em]">{value}</div>
    </div>
  );
}

/** An area tile: its own colour wash, icon, score, name and a progress rail. */
function AreaCard({ tile }: { tile: AreaTile }) {
  const Icon = tile.icon;
  return (
    <Link
      href={tile.href}
      className="flex flex-col justify-between rounded-[18px] border p-3.5"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${tile.color} 22%, var(--surface)), color-mix(in srgb, ${tile.color} 6%, var(--surface)))`,
        borderColor: `color-mix(in srgb, ${tile.color} 28%, transparent)`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[9px]"
          style={{
            background: `color-mix(in srgb, ${tile.color} 22%, transparent)`,
            color: tile.color,
          }}
        >
          <Icon size={14} />
        </span>
        <span className="num text-[20px] font-bold leading-none tracking-[-0.03em]">{tile.score}</span>
      </div>
      <div className="mt-3.5 text-[12.5px] font-medium">{tile.label}</div>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--text) 10%, transparent)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, Math.min(100, tile.score))}%`, background: tile.color, transition: "width .6s ease" }}
        />
      </div>
    </Link>
  );
}
