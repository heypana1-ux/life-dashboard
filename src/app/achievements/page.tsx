"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { computeAchievements, computeRecords } from "@/lib/achievements";
import { computeLevel, CHALLENGE_XP } from "@/lib/level";
import { weeklyChallenges, Challenge } from "@/lib/challenges";
import { dailyQuests, Quest, QUEST_POINTS } from "@/lib/quests";
import { ACCENT_REWARDS, ACCENT_SWATCH, accentOwned } from "@/lib/rewards";
import { titleName, badgeEmoji } from "@/lib/cosmetics";
import { Lock, Sparkles, Coins } from "lucide-react";
import { todayISO, addDays, weekdayOf } from "@/lib/date";
import { Card, PageHeader, SectionTitle, Badge } from "@/components/ui";
import clsx from "clsx";

export default function AchievementsPage() {
  const { data, updateSettings, claimChallenge, claimQuest } = useStore();
  const d = useDerived();
  const t = useT();

  const achievements = useMemo(() => computeAchievements(data, d.history), [data, d.history]);
  const records = useMemo(() => computeRecords(data, d.history), [data, d.history]);
  const level = useMemo(() => computeLevel(data, d.history), [data, d.history]);
  const challenges = useMemo(() => weeklyChallenges(data, d.byDate, todayISO()), [data, d.byDate]);
  const quests = useMemo(() => dailyQuests(data, todayISO()), [data]);
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const challengesDone = challenges.filter((c) => c.done).length;
  const questsDone = quests.filter((q) => q.done).length;

  const owned = data.rewards.owned ?? [];
  const weekAnchorToday = addDays(todayISO(), -weekdayOf(todayISO()));
  const claimedIds = new Set(
    (data.rewards.challengeClaims ?? []).filter((c) => c.week === weekAnchorToday).map((c) => c.id),
  );
  const claimedQuestIds = new Set(
    (data.rewards.questClaims ?? []).filter((c) => c.date === todayISO()).map((c) => c.id),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("Milestones & records")}
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
              <span className="text-lg font-semibold">
                {badgeEmoji(data.settings.badge) && (
                  <span className="mr-1">{badgeEmoji(data.settings.badge)}</span>
                )}
                {titleName(data.settings.title) ? t(titleName(data.settings.title)!) : t(level.title)}
              </span>
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

      {/* Daily quests */}
      <Card>
        <SectionTitle right={<Badge tone="accent">{questsDone}/{quests.length} {t("done")}</Badge>}>
          {t("Today's quests")}
        </SectionTitle>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          {t("Small daily tasks — claim each for {n} points.", { n: QUEST_POINTS })}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quests.map((q) => (
            <QuestRow
              key={q.id}
              q={q}
              claimed={claimedQuestIds.has(q.id)}
              onClaim={() => claimQuest(q.id)}
            />
          ))}
        </div>
      </Card>

      {/* Weekly challenges */}
      <Card>
        <SectionTitle right={<Badge tone="accent">{challengesDone}/{challenges.length} {t("done")}</Badge>}>
          {t("This week's challenges")}
        </SectionTitle>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          {t("Complete a challenge, then claim it for {n} XP.", { n: CHALLENGE_XP })}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {challenges.map((c) => (
            <ChallengeRow
              key={c.id}
              c={c}
              claimed={claimedIds.has(c.id)}
              onClaim={() => claimChallenge(c.id)}
            />
          ))}
        </div>
      </Card>

      {/* Cosmetic rewards */}
      <Card>
        <SectionTitle right={<Badge tone="accent">{t("Level {n}", { n: level.level })}</Badge>}>{t("Rewards")}</SectionTitle>
        <p className="mb-3 text-xs text-[var(--text-muted)]">{t("Unlock accent themes by leveling up or buying them in the Reward shop. Purely cosmetic.")}</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {ACCENT_REWARDS.map((r) => {
            const isOwned = accentOwned(r.accent, level.level, owned);
            const activeAccent = (data.settings.accent ?? "calm") === r.accent;
            const levelGated = r.unlockLevel <= 99;
            return (
              <button
                key={r.accent}
                disabled={!isOwned}
                onClick={() => updateSettings({ accent: r.accent })}
                className={clsx(
                  "flex items-center gap-2.5 rounded-xl border p-3 text-left transition",
                  activeAccent ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]",
                  isOwned ? "hover:border-[var(--accent)]" : "opacity-60",
                )}
              >
                <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: ACCENT_SWATCH[r.accent] }} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t(r.name)}</div>
                  <div className="text-[11px] text-[var(--text-faint)]">
                    {isOwned ? (
                      activeAccent ? t("Active") : t("Apply")
                    ) : levelGated ? (
                      <span className="inline-flex items-center gap-1"><Lock size={10} /> {t("Level {n}", { n: r.unlockLevel })}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Coins size={10} /> {r.cost} {t("pts")}</span>
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

function ChallengeRow({ c, claimed, onClaim }: { c: Challenge; claimed: boolean; onClaim: () => void }) {
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
            claimed ? (
              <Badge tone="good">+{CHALLENGE_XP} XP</Badge>
            ) : (
              <button
                onClick={onClaim}
                className="grad flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
              >
                <Sparkles size={11} /> {t("Claim {n} XP", { n: CHALLENGE_XP })}
              </button>
            )
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

function QuestRow({ q, claimed, onClaim }: { q: Quest; claimed: boolean; onClaim: () => void }) {
  const t = useT();
  const label = q.id === "habits3" ? t("Complete {n} habits today", { n: q.target }) : t(q.title);
  const pct = Math.min(100, Math.round((q.current / Math.max(1, q.target)) * 100));
  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-xl border p-3 transition",
        q.done ? "border-[var(--good)] bg-[var(--good)]/10" : "border-[var(--border)] bg-[var(--surface-2)]",
      )}
    >
      <div className={clsx("text-2xl", !q.done && "opacity-70")}>{q.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{label}</span>
          {q.done ? (
            claimed ? (
              <Badge tone="good">+{QUEST_POINTS} {t("pts")}</Badge>
            ) : (
              <button
                onClick={onClaim}
                className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-white"
              >
                <Coins size={11} /> {t("Claim {n} pts", { n: QUEST_POINTS })}
              </button>
            )
          ) : (
            <span className="shrink-0 text-xs tabular-nums text-[var(--text-faint)]">{q.current}/{q.target}</span>
          )}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: q.done ? "var(--good)" : "var(--accent)" }} />
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
