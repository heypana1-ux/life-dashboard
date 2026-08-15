"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { computeAchievements, computeRecords } from "@/lib/achievements";
import { computeLevel } from "@/lib/level";
import { weeklyChallenges, Challenge } from "@/lib/challenges";
import { ACCENT_REWARDS } from "@/lib/rewards";
import { Accent } from "@/lib/types";
import { Lock } from "lucide-react";
import { todayISO } from "@/lib/date";
import { Card, PageHeader, SectionTitle, Badge } from "@/components/ui";
import clsx from "clsx";

const ACCENT_SWATCH: Record<Accent, string> = {
  calm: "linear-gradient(135deg,#6366f1,#4f46e5)",
  aurora: "linear-gradient(135deg,#06b6d4,#4f46e5)",
  mono: "linear-gradient(135deg,#52525b,#27272a)",
  sunset: "linear-gradient(135deg,#f97316,#db2777)",
  forest: "linear-gradient(135deg,#22c55e,#0d9488)",
  rose: "linear-gradient(135deg,#f43f5e,#a855f7)",
};

export default function AchievementsPage() {
  const { data, updateSettings } = useStore();
  const d = useDerived();
  const t = useT();

  const achievements = useMemo(() => computeAchievements(data, d.history), [data, d.history]);
  const records = useMemo(() => computeRecords(data, d.history), [data, d.history]);
  const level = useMemo(() => computeLevel(data, d.history), [data, d.history]);
  const challenges = useMemo(() => weeklyChallenges(data, d.byDate, todayISO()), [data, d.byDate]);
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const challengesDone = challenges.filter((c) => c.done).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Achievements")}
        subtitle={t("Milestones and personal records from your data.")}
      />

      {/* Level / XP */}
      <div className="grad relative overflow-hidden rounded-[22px] p-6 text-white shadow-[var(--shadow)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium opacity-85">{t("Level")}</div>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span className="num text-[52px] font-bold leading-none">{level.level}</span>
              <span className="text-lg font-semibold">{t(level.title)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="num text-2xl font-bold">{level.xp.toLocaleString()}</div>
            <div className="text-xs opacity-85">{t("total XP")}</div>
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${level.pct}%`, transition: "width .6s ease" }} />
        </div>
        <div className="mt-1.5 text-xs opacity-90">
          {level.intoLevel.toLocaleString()} / {level.span.toLocaleString()} {t("XP to level {n}", { n: level.level + 1 })}
        </div>
      </div>

      {/* Weekly challenges */}
      <Card>
        <SectionTitle right={<Badge tone="accent">{challengesDone}/{challenges.length} {t("done")}</Badge>}>
          {t("This week's challenges")}
        </SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {challenges.map((c) => (
            <ChallengeRow key={c.id} c={c} />
          ))}
        </div>
      </Card>

      {/* Cosmetic rewards */}
      <Card>
        <SectionTitle right={<Badge tone="accent">{t("Level {n}", { n: level.level })}</Badge>}>{t("Rewards")}</SectionTitle>
        <p className="mb-3 text-xs text-[var(--text-muted)]">{t("Unlock accent themes as you level up. Purely cosmetic.")}</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {ACCENT_REWARDS.map((r) => {
            const unlocked = level.level >= r.unlockLevel;
            const activeAccent = (data.settings.accent ?? "calm") === r.accent;
            return (
              <button
                key={r.accent}
                disabled={!unlocked}
                onClick={() => updateSettings({ accent: r.accent })}
                className={clsx(
                  "flex items-center gap-2.5 rounded-xl border p-3 text-left transition",
                  activeAccent ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]",
                  unlocked ? "hover:border-[var(--accent)]" : "opacity-60",
                )}
              >
                <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: ACCENT_SWATCH[r.accent] }} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t(r.name)}</div>
                  <div className="text-[11px] text-[var(--text-faint)]">
                    {unlocked ? (activeAccent ? t("Active") : t("Apply")) : (
                      <span className="inline-flex items-center gap-1"><Lock size={10} /> {t("Level {n}", { n: r.unlockLevel })}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle right={<Badge tone="accent">{unlocked}/{achievements.length} {t("Unlocked")}</Badge>}>
          {t("Achievements")}
        </SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => {
            const pct = Math.min(100, Math.round((a.current / a.target) * 100));
            return (
              <div
                key={a.id}
                className={clsx(
                  "flex items-start gap-3 rounded-xl border p-3 transition",
                  a.unlocked
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--surface-2)]",
                )}
              >
                <div className={clsx("text-2xl", !a.unlocked && "opacity-40 grayscale")}>{a.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{t(a.title)}</span>
                    {a.unlocked && <Badge tone="good">✓</Badge>}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{t(a.description)}</p>
                  {!a.unlocked && (
                    <div className="mt-2">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] tabular-nums text-[var(--text-faint)]">
                        {a.current} / {a.target}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-[var(--text-faint)]">{t("Keep logging to unlock more.")}</p>
      </Card>

      <Card>
        <SectionTitle>{t("Personal records")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {records.map((r) => (
            <div key={r.id} className="rounded-xl bg-[var(--surface-2)] p-4">
              <div className="mb-1 text-2xl">{r.icon}</div>
              <div className="text-lg font-bold tabular-nums">{r.value}</div>
              <div className="text-xs text-[var(--text-muted)]">{t(r.label)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ChallengeRow({ c }: { c: Challenge }) {
  const t = useT();
  const label = challengeLabel(c, t);
  const pct = Math.min(100, Math.round((c.current / c.target) * 100));
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-xl border p-3 transition",
        c.done ? "border-[var(--good)] bg-[var(--good)]/10" : "border-[var(--border)] bg-[var(--surface-2)]",
      )}
    >
      <div className={clsx("text-2xl", !c.done && "opacity-70")}>{c.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{label}</span>
          {c.done ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--good)] text-white">
              <Check size={12} strokeWidth={3} />
            </span>
          ) : (
            <span className="shrink-0 text-xs tabular-nums text-[var(--text-faint)]">{fmt(c.current)}/{fmt(c.target)}</span>
          )}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.done ? "var(--good)" : "var(--accent)" }} />
        </div>
      </div>
    </div>
  );
}

function challengeLabel(c: Challenge, t: (k: string, v?: Record<string, string | number>) => string): string {
  switch (c.id) {
    case "train":
      return t("Train {n}× this week", { n: c.target });
    case "logall":
      return t("Log all 7 days");
    case "sleep":
      return t("Average {h}h sleep", { h: c.target });
    case "habits":
      return t("Hit {n}% of your habits", { n: c.target });
    case "journal":
      return t("Write 3 journal entries");
    case "checkin":
      return t("Check in on 5 days");
    default:
      return c.title;
  }
}
