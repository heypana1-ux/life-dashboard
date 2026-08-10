import { AppData, DayScore } from "./types";
import { computeDay } from "./score";
import { sleepDurationMinutes, weekdayLabel, weekdayOf } from "./date";

/*
  Insight engine. Produces observations grounded in the user's OWN data, phrased as
  correlations/associations — never as medical/causal claims. Every generator requires a
  minimum sample and otherwise stays silent (a global fallback covers the empty case).
*/

export interface Insight {
  id: string;
  text: string;
  tone: "good" | "info" | "warn";
}

const MIN_SAMPLE = 6;

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function buildInsights(data: AppData, history: DayScore[]): Insight[] {
  const insights: Insight[] = [];
  const withData = history.filter((h) => h.lifeScore > 0);

  // 1) Sleep vs. next-day productivity (uses reviews + sleep)
  const target = data.settings.sleepTargetMinutes;
  const above: number[] = [];
  const below: number[] = [];
  for (const s of data.sleep) {
    const dur = sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0);
    const r = data.reviews.find((x) => x.date === s.date);
    if (!r) continue;
    (dur >= target ? above : below).push(r.productivity * 10);
  }
  if (above.length >= MIN_SAMPLE && below.length >= MIN_SAMPLE) {
    const diff = mean(above) - mean(below);
    if (Math.abs(diff) >= 4) {
      const pct = Math.round((Math.abs(diff) / Math.max(1, mean(below))) * 100);
      insights.push({
        id: "sleep-prod",
        tone: diff > 0 ? "good" : "info",
        text:
          diff > 0
            ? `On nights you hit your sleep target, your rated productivity is about ${pct}% higher.`
            : `Your productivity ratings don't rise with more sleep in this window — the pattern is weak so far.`,
      });
    }
  }

  // 2) Training days vs. mood
  const sportHabits = new Set(
    data.habits.filter((h) => h.area === "sport" && h.kind === "build").map((h) => h.id),
  );
  const trainedDates = new Set(
    data.habitLogs.filter((l) => l.done && sportHabits.has(l.habitId)).map((l) => l.date),
  );
  const moodTrained: number[] = [];
  const moodRest: number[] = [];
  for (const r of data.reviews) {
    (trainedDates.has(r.date) ? moodTrained : moodRest).push(r.mood);
  }
  if (moodTrained.length >= MIN_SAMPLE && moodRest.length >= MIN_SAMPLE) {
    const diff = mean(moodTrained) - mean(moodRest);
    if (diff >= 0.6) {
      insights.push({
        id: "train-mood",
        tone: "good",
        text: `Your mood averages ${diff.toFixed(1)} points higher (out of 10) on days you train.`,
      });
    }
  }

  // 3) Training days vs. Life Score
  const lsTrained: number[] = [];
  const lsRest: number[] = [];
  for (const h of withData) {
    (trainedDates.has(h.date) ? lsTrained : lsRest).push(h.lifeScore);
  }
  if (lsTrained.length >= MIN_SAMPLE && lsRest.length >= MIN_SAMPLE) {
    const diff = Math.round(mean(lsTrained) - mean(lsRest));
    if (diff >= 4) {
      insights.push({
        id: "train-ls",
        tone: "good",
        text: `On days with a workout your Life Score is on average ${diff} points higher.`,
      });
    }
  }

  // 4) Most productive weekday
  const byWd: number[][] = Array.from({ length: 7 }, () => []);
  for (const h of withData) byWd[weekdayOf(h.date)].push(h.lifeScore);
  const wdMeans = byWd.map((xs, i) => ({ i, m: xs.length >= 3 ? mean(xs) : -1 }));
  const ranked = wdMeans.filter((x) => x.m >= 0).sort((a, b) => b.m - a.m);
  if (ranked.length >= 4) {
    const best = ranked.slice(0, 2).map((x) => weekdayLabel(x.i, true));
    insights.push({
      id: "best-weekday",
      tone: "info",
      text: `Your strongest days recently tend to be ${best.join(" and ")}.`,
    });
  }

  // 5) Negative-habit concentration by weekday
  const reduceIds = new Set(data.habits.filter((h) => h.kind === "reduce").map((h) => h.id));
  const slipByWd = Array.from({ length: 7 }, () => 0);
  const daysByWd = Array.from({ length: 7 }, () => 0);
  const seen = new Set<string>();
  for (const l of data.habitLogs) {
    if (!reduceIds.has(l.habitId)) continue;
    const key = l.date;
    if (!seen.has(key)) {
      seen.add(key);
      daysByWd[weekdayOf(l.date)] += 1;
    }
    if (l.done) slipByWd[weekdayOf(l.date)] += 1;
  }
  const rate = slipByWd.map((s, i) => (daysByWd[i] > 0 ? s / daysByWd[i] : 0));
  const overallRate = mean(rate.filter((_, i) => daysByWd[i] > 0));
  let worst = -1;
  let worstRate = 0;
  rate.forEach((r, i) => {
    if (daysByWd[i] >= 3 && r > worstRate) {
      worstRate = r;
      worst = i;
    }
  });
  if (worst >= 0 && overallRate > 0 && worstRate > overallRate * 1.25) {
    const pct = Math.round(((worstRate - overallRate) / overallRate) * 100);
    insights.push({
      id: "neg-weekday",
      tone: "warn",
      text: `${weekdayLabel(worst, true)}s show your reduce-habits about ${pct}% above your average.`,
    });
  }

  // 6) Trend
  if (withData.length >= 10) {
    const recent = mean(withData.slice(-7).map((x) => x.lifeScore));
    const prior = mean(withData.slice(-14, -7).map((x) => x.lifeScore));
    if (prior > 0) {
      const diff = Math.round(recent - prior);
      if (Math.abs(diff) >= 3) {
        insights.push({
          id: "trend",
          tone: diff > 0 ? "good" : "warn",
          text:
            diff > 0
              ? `Your 7-day Life Score is up ${diff} points versus the week before — momentum is building.`
              : `Your 7-day Life Score is down ${Math.abs(diff)} points versus the week before.`,
        });
      }
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: "empty",
      tone: "info",
      text: "Not enough data yet for reliable insights. Keep logging — patterns appear after a couple of weeks.",
    });
  }

  return insights;
}

/** Today's category breakdown, handy for the dashboard. */
export function todayBreakdown(data: AppData, dateISO: string) {
  return computeDay(data, dateISO);
}
