"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Flame, ListTodo, Moon, Sparkles, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/defaults";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { habitsForToday } from "@/lib/habitView";
import { habitCurrentStreak } from "@/lib/habitStats";
import { AREA_LABELS } from "@/lib/defaults";
import { sleepScore, PRIORITY_POINTS } from "@/lib/score";
import { activityStreak } from "@/lib/streak";
import { buildCoachContext } from "@/lib/coachContext";
import { coachAsk, checkCoachConfigured } from "@/lib/ai";
import { fmtDuration, fmtShort, sleepDurationMinutes, todayISO, weekdayOf, weekdayLabel } from "@/lib/date";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { HabitRow } from "@/components/HabitRow";
import { CoachBriefing } from "@/components/Coach";

export default function MorningPage() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const date = todayISO();
  const name = data.settings.profile.name?.trim();

  const sleep = data.sleep.find((s) => s.date === date);
  const sleepMin = sleep
    ? sleepDurationMinutes(sleep.bedTime, sleep.wakeTime, sleep.fallAsleepMinutes ?? 0)
    : 0;
  const sScore = sleep ? Math.round(sleepScore(sleep, data.settings.sleepTargetMinutes)) : null;

  const goals = habitsForToday(data, date).filter((g) => g.habit.kind === "build");
  const elo = d.todayScore?.elo ?? data.settings.eloStart;

  const streak = useMemo(() => activityStreak(d.history, data.settings), [d.history, data.settings]);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? t("Good morning") : hour < 18 ? t("Good afternoon") : t("Good evening");
  const gParts = greeting.split(" ");
  const gLead = gParts.length > 1 ? gParts[0] : undefined;
  const gWord = gParts.length > 1 ? gParts.slice(1).join(" ") : greeting;

  // Weekly Life-Rating delta for the RATING tile.
  const scoredHist = d.history.filter((h) => h.lifeScore > 0);
  const weekAgoElo = scoredHist.length > 7 ? scoredHist[scoredHist.length - 8].elo : scoredHist[0]?.elo ?? data.settings.eloStart;
  const eloWeekDelta = Math.round(elo - weekAgoElo);

  return (
    <div>
      <PageHeader
        kicker={`${weekdayLabel(weekdayOf(date))} · ${fmtShort(date)}`}
        lead={gLead}
        title={gWord}
        trail={name ? `, ${name}` : undefined}
        subtitle={t("Set your intention for the day. Small, consistent steps compound.")}
      />

      <div className="flex flex-col gap-[18px]">
        {/* 3 tiles */}
        <div className="grid grid-cols-3 gap-[9px]">
          <div className="tile p-[14px]">
            <div className="mb-2 flex items-center gap-1.5 text-[var(--text-faint)]">
              <Moon size={14} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em]">{t("Last night")}</span>
            </div>
            {sleep ? (
              <>
                <div className="num text-[22px] font-bold leading-tight tracking-[-0.02em]">{fmtDuration(sleepMin)}</div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {t("Sleep")} <span className="num font-bold text-[var(--good)]">{sScore}</span> · {t("energy")} {sleep.morningEnergy}/10
                </div>
              </>
            ) : (
              <Link href="/sleep" className="text-[13px] text-[var(--accent)]">
                {t("Log sleep")}
              </Link>
            )}
          </div>
          <div className="tile p-[14px]">
            <div className="mb-2 flex items-center gap-1.5 text-[var(--text-faint)]">
              <Trophy size={14} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em]">{t("Rating")}</span>
            </div>
            <div className="num text-[22px] font-bold leading-tight tracking-[-0.02em]">{elo.toLocaleString()}</div>
            {eloWeekDelta !== 0 && (
              <div className="mt-0.5 text-[11px]" style={{ color: eloWeekDelta > 0 ? "var(--good)" : "var(--bad)" }}>
                {eloWeekDelta > 0 ? "+" : ""}{eloWeekDelta} {t("this week")}
              </div>
            )}
          </div>
          <div className="tile p-[14px]">
            <div className="mb-2 flex items-center gap-1.5 text-[var(--text-faint)]">
              <Flame size={14} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em]">{t("Streak")}</span>
            </div>
            <div className="num text-[22px] font-bold leading-tight tracking-[-0.02em]">{streak}d</div>
            <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{t("days with activity")}</div>
          </div>
        </div>

        {/* Proactive coach briefing (only when the AI coach is enabled) */}
        <CoachBriefing />

        {/* Optional top-3 focus for the day */}
        <FocusCard />

        {/* Focus */}
        <Card>
          <SectionTitle right={<Link href="/today" className="text-xs text-[var(--accent)]">{t("Open →")}</Link>}>
            {t("Today's goals")}
          </SectionTitle>
          {goals.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("No habits scheduled today")}</p>
          ) : (
            <div className="grid gap-x-[26px] sm:grid-cols-2">
              {goals.map((g) => (
                <HabitRow
                  key={g.habit.id}
                  item={g}
                  date={date}
                  meta={`${t(AREA_LABELS[g.habit.area])} · ${habitCurrentStreak(data, g.habit)} ${t("day streak")}`}
                  trailing={
                    <span className="num shrink-0 text-[11.5px] font-semibold text-[var(--good)]">
                      +{PRIORITY_POINTS[g.habit.priority]}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

type FocusItem = { id: string; text: string; done: boolean };

const PLAN_PROMPT =
  "Propose exactly 3 focus items for my day based on my data, goals and today's habits. Each item max 6 words, concrete and actionable. Return ONLY the three items, one per line, no numbering, no bullets, no extra words.";

function FocusCard() {
  const { data, setFocus } = useStore();
  const d = useDerived();
  const t = useT();
  const date = todayISO();
  const existing = data.focus.find((f) => f.date === date);
  const aiOn = !!data.settings.aiCoachEnabled;
  const [planning, setPlanning] = useState(false);

  const seed = (): FocusItem[] => {
    const base = existing?.items.map((i) => ({ ...i })) ?? [];
    while (base.length < 3) base.push({ id: uid("foc"), text: "", done: false });
    return base.slice(0, 3);
  };
  const [items, setItems] = useState<FocusItem[]>(seed);

  function persist(next: FocusItem[]) {
    setItems(next);
    setFocus(date, next.filter((i) => i.text.trim()));
  }

  async function planMyDay() {
    if (planning) return;
    setPlanning(true);
    const ok = await checkCoachConfigured();
    if (!ok) {
      setPlanning(false);
      return;
    }
    const ctx = buildCoachContext(data, d.history).text;
    const res = await coachAsk(PLAN_PROMPT, ctx, data.settings.language);
    setPlanning(false);
    if (!res.reply) return;
    const lines = res.reply
      .split("\n")
      .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
    if (lines.length) {
      // Keep any already-completed items; overwrite empty/undone slots with suggestions.
      const next: FocusItem[] = lines.map((text, i) => ({
        id: items[i]?.id ?? uid("foc"),
        text,
        done: false,
      }));
      while (next.length < 3) next.push({ id: uid("foc"), text: "", done: false });
      persist(next);
    }
  }

  const doneCount = items.filter((i) => i.text.trim() && i.done).length;
  const setCount = items.filter((i) => i.text.trim()).length;

  return (
    <Card>
      <SectionTitle
        right={
          <div className="flex items-center gap-2">
            {aiOn && (
              <button
                onClick={planMyDay}
                disabled={planning}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-xs font-medium text-[var(--accent)] disabled:opacity-50"
              >
                <Sparkles size={12} /> {planning ? t("Planning…") : t("Plan my day")}
              </button>
            )}
            {setCount > 0 ? (
              <span className="text-xs text-[var(--text-faint)]">
                {doneCount}/{setCount} · {t("up to +2 score")}
              </span>
            ) : (
              <span className="text-xs text-[var(--text-faint)]">{t("optional")}</span>
            )}
          </div>
        }
      >
        <span className="inline-flex items-center gap-1.5">
          <ListTodo size={16} /> {t("Today's focus")}
        </span>
      </SectionTitle>
      <p className="mb-2 text-xs text-[var(--text-muted)]">{t("Pick up to three things that would make today a win.")}</p>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center gap-2.5">
            <button
              onClick={() => persist(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
              disabled={!it.text.trim()}
              aria-label={t("Mark done")}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition disabled:opacity-40 ${
                it.done && it.text.trim() ? "border-[var(--good)] bg-[var(--good)] text-white" : "border-[var(--border)] text-transparent"
              }`}
            >
              <Check size={13} strokeWidth={3} />
            </button>
            <input
              value={it.text}
              onChange={(e) => persist(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              placeholder={`${t("Focus")} ${i + 1}`}
              className={`flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] ${it.done && it.text.trim() ? "text-[var(--text-muted)] line-through" : ""}`}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
