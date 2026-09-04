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

/** Thin progress track — 5px with an area-tinted rail, as in the Pulse mock. */
function Track({ pct, done }: { pct: number; done?: boolean }) {
  return (
    <div
      className="h-[5px] overflow-hidden rounded-full"
      style={{ background: "color-mix(in srgb, var(--area-a) 12%, transparent)" }}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: done ? "var(--good)" : "var(--area-a)" }}
      />
    </div>
  );
}

/** Claim pill — area gradient with area ink. */
function ClaimPill({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="area-grad inline-flex shrink-0 items-center gap-1 rounded-full px-[9px] py-1 text-[10px] font-bold"
    >
      {children}
    </button>
  );
}

/** Green "done" badge (claimed quests/challenges, unlocked achievements). */
function DoneBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--good)_16%,transparent)] px-2 py-[3px] text-[10px] font-bold text-[var(--good)]">
      {children}
    </span>
  );
}

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
    <div className="space-y-[14px]">
      <PageHeader
        kicker={`${t("Level")} ${level.level} · ${level.xp.toLocaleString()} XP`}
        title={t("Achievements")}
      />

      {/* Level / XP banner — area gradient with area ink, exactly as in the mock. */}
      <div className="area-grad relative overflow-hidden rounded-[24px] p-[19px] shadow-[var(--shadow)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">
              {t("Level")}
            </div>
            <div className="mt-[5px] flex items-baseline gap-[9px]">
              <span className="num text-[46px] font-bold leading-[0.9] tracking-[-0.04em]">
                {level.level}
              </span>
              <span className="text-[15px] font-semibold">
                {badgeEmoji(data.settings.badge) && (
                  <span className="mr-1">{badgeEmoji(data.settings.badge)}</span>
                )}
                {titleName(data.settings.title) ? t(titleName(data.settings.title)!) : t(level.title)}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="num text-[20px] font-bold leading-none">{level.xp.toLocaleString()}</div>
            <div className="mt-1 text-[10.5px] opacity-75">{t("total XP")}</div>
          </div>
        </div>
        <div className="mt-[15px] h-[9px] overflow-hidden rounded-full bg-black/[0.16]">
          <div
            className="h-full rounded-full bg-[var(--area-ink)]"
            style={{ width: `${level.pct}%`, transition: "width .6s ease" }}
          />
        </div>
        <div className="mt-1.5 text-[11px] opacity-80">
          {level.intoLevel.toLocaleString()} / {level.span.toLocaleString()}{" "}
          {t("XP to level {n}", { n: level.level + 1 })}
        </div>
      </div>

      {/* Daily quests */}
      <Card>
        <SectionTitle right={<Badge tone="accent">{questsDone}/{quests.length} {t("done")}</Badge>}>
          {t("Today's quests")}
        </SectionTitle>
        <p className="-mt-1 mb-[11px] text-[11.5px] text-[var(--text-muted)]">
          {t("Small daily tasks — claim each for {n} points.", { n: QUEST_POINTS })}
        </p>
        <div className="flex flex-col gap-[9px]">
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
        <p className="-mt-1 mb-[11px] text-[11.5px] text-[var(--text-muted)]">
          {t("Complete a challenge, then claim it for {n} XP.", { n: CHALLENGE_XP })}
        </p>
        <div className="flex flex-col gap-[9px]">
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
        <p className="-mt-1 mb-[11px] text-[11.5px] text-[var(--text-muted)]">
          {t("Unlock accent themes by leveling up or buying them in the Reward shop. Purely cosmetic.")}
        </p>
        <div className="grid grid-cols-2 gap-2">
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
                  "flex items-center gap-2.5 rounded-[15px] border px-3 py-[11px] text-left transition",
                  activeAccent
                    ? "area-soft border-[var(--area-a)]"
                    : "border-[var(--border)] hover:border-[var(--area-a)]",
                  !isOwned && "opacity-60",
                )}
              >
                <span
                  className="h-[30px] w-[30px] shrink-0 rounded-[11px]"
                  style={{ background: ACCENT_SWATCH[r.accent] }}
                />
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-medium text-[var(--text)]">{t(r.name)}</div>
                  <div
                    className={clsx(
                      "flex items-center gap-1 text-[10.5px]",
                      activeAccent ? "area-text" : "text-[var(--text-faint)]",
                    )}
                  >
                    {isOwned ? (
                      activeAccent ? t("Active") : t("Apply")
                    ) : levelGated ? (
                      <>
                        <Lock size={10} /> {t("Level {n}", { n: r.unlockLevel })}
                      </>
                    ) : (
                      <>
                        <Coins size={10} /> {r.cost} {t("pts")}
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Badges */}
      <Card>
        <SectionTitle right={<Badge tone="accent">{unlocked}/{achievements.length} {t("Unlocked")}</Badge>}>
          {t("Achievements")}
        </SectionTitle>
        <div className="flex flex-col gap-[9px]">
          {achievements.map((a) => {
            const pct = Math.min(100, Math.round((a.current / a.target) * 100));
            return (
              <div
                key={a.id}
                className={clsx(
                  "flex items-start gap-[11px] rounded-[16px] border px-[13px] py-3",
                  a.unlocked
                    ? "area-soft !text-[var(--text)] border-[color-mix(in_srgb,var(--area-a)_35%,transparent)]"
                    : "border-[var(--border)] bg-[var(--surface-2)]",
                )}
              >
                <span className={clsx("text-[20px] leading-none", !a.unlocked && "opacity-40 grayscale")}>
                  {a.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-semibold">{t(a.title)}</span>
                    {a.unlocked && <DoneBadge>✓</DoneBadge>}
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-[var(--text-muted)]">{t(a.description)}</p>
                  {!a.unlocked && (
                    <div className="mt-2">
                      <Track pct={pct} />
                      <div className="num mt-1 text-[10px] text-[var(--text-faint)]">
                        {a.current} / {a.target}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[10.5px] text-[var(--text-dim)]">{t("Keep logging to unlock more.")}</p>
      </Card>

      <Card>
        <SectionTitle>{t("Personal records")}</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {records.map((r) => (
            <div key={r.id} className="rounded-[16px] bg-[var(--surface-2)] p-3.5">
              <div className="text-[19px] leading-none">{r.icon}</div>
              <div className="num mt-2 text-[17px] font-bold">{r.value}</div>
              <div className="text-[11px] text-[var(--text-muted)]">{t(r.label)}</div>
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
        "flex items-center gap-[11px] rounded-[16px] border bg-[var(--surface-2)] px-[13px] py-3",
        c.done ? "border-[color-mix(in_srgb,var(--good)_35%,transparent)]" : "border-[var(--border)]",
      )}
    >
      <span className={clsx("text-[19px] leading-none", !c.done && "opacity-70")}>{c.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-medium">{label}</span>
          {c.done ? (
            claimed ? (
              <DoneBadge>+{CHALLENGE_XP} XP</DoneBadge>
            ) : (
              <ClaimPill onClick={onClaim}>
                <Sparkles size={10} /> {t("Claim {n} XP", { n: CHALLENGE_XP })}
              </ClaimPill>
            )
          ) : (
            <span className="num shrink-0 text-[10.5px] text-[var(--text-faint)]">
              {fmt(c.current)}/{fmt(c.target)}
            </span>
          )}
        </div>
        <div className="mt-[7px]">
          <Track pct={pct} done={c.done} />
        </div>
      </div>
    </div>
  );
}

function QuestRow({ q, claimed, onClaim }: { q: Quest; claimed: boolean; onClaim: () => void }) {
  const t = useT();
  // Same as challengeLabel: {n} in a quest title always means its target.
  const label = t(q.title, { n: q.target });
  const pct = Math.min(100, Math.round((q.current / Math.max(1, q.target)) * 100));
  return (
    <div
      className={clsx(
        "flex items-center gap-[11px] rounded-[16px] border bg-[var(--surface-2)] px-[13px] py-3",
        q.done ? "border-[color-mix(in_srgb,var(--good)_35%,transparent)]" : "border-[var(--border)]",
      )}
    >
      <span className={clsx("text-[19px] leading-none", !q.done && "opacity-70")}>{q.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-medium">{label}</span>
          {q.done ? (
            claimed ? (
              <DoneBadge>+{QUEST_POINTS} {t("pts")}</DoneBadge>
            ) : (
              <ClaimPill onClick={onClaim}>
                <Coins size={10} /> {t("Claim {n} pts", { n: QUEST_POINTS })}
              </ClaimPill>
            )
          ) : (
            <span className="num shrink-0 text-[10.5px] text-[var(--text-faint)]">
              {q.current}/{q.target}
            </span>
          )}
        </div>
        <div className="mt-[7px]">
          <Track pct={pct} done={q.done} />
        </div>
      </div>
    </div>
  );
}

/** Titles are English keys that may carry {n} (a count) or {h} (hours); both resolve to the
 *  challenge's own target, so every id in the pool renders without a per-id branch. */
function challengeLabel(c: Challenge, t: (k: string, v?: Record<string, string | number>) => string): string {
  return t(c.title, { n: c.target, h: c.target });
}
