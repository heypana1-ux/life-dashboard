import { AppData, DayScore } from "./types";
import { isoRange, sleepDurationMinutes } from "./date";
import { financeTotals, budgetForMonth, currentMonth } from "./finance";

/*
  Achievements & records are DERIVED from the data (never stored), so they stay correct as
  history changes. Each achievement exposes progress toward a target; records are best-so-far
  values. Titles/descriptions are English keys translated at render time.
*/

export interface Achievement {
  id: string;
  title: string; // English key
  description: string; // English key
  icon: string; // emoji
  current: number;
  target: number;
  unlocked: boolean;
}

export interface Record {
  id: string;
  label: string; // English key
  value: string;
  icon: string;
}

function longestStreak(history: DayScore[]): number {
  let best = 0;
  let cur = 0;
  for (const h of history) {
    if (h.lifeScore > 0) {
      cur++;
      best = Math.max(best, cur);
    } else cur = 0;
  }
  return best;
}

function currentStreak(history: DayScore[]): number {
  let s = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].lifeScore > 0) s++;
    else break;
  }
  return s;
}

function bestSleepWeekAvg(data: AppData): number {
  if (data.sleep.length < 7) return 0;
  const byDate = new Map(
    data.sleep.map((s) => [s.date, sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0)]),
  );
  let best = 0;
  const dates = [...byDate.keys()].sort();
  for (let i = 6; i < dates.length; i++) {
    const window = isoRange(dates[i], 7);
    const vals = window.map((d) => byDate.get(d)).filter((v): v is number => v !== undefined);
    if (vals.length >= 5) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      best = Math.max(best, avg);
    }
  }
  return best;
}

function bestMonthlySavings(data: AppData): number {
  const months = new Set(data.finances.transactions.map((t) => t.date.slice(0, 7)));
  let best = 0;
  for (const m of months) {
    const b = budgetForMonth(data.finances.transactions, m);
    if (b.income > 0) best = Math.max(best, b.savingsRate);
  }
  return best;
}

function mostWorkoutsInWeek(data: AppData): number {
  if (data.workouts.length === 0) return 0;
  const dates = [...new Set(data.workouts.map((w) => w.date))].sort();
  let best = 0;
  for (const d of dates) {
    const window = new Set(isoRange(d, 7));
    best = Math.max(best, data.workouts.filter((w) => window.has(w.date)).length);
  }
  return best;
}

function learningMinutes(data: AppData): number {
  const learn = new Set(data.habits.filter((h) => h.area === "learning").map((h) => h.id));
  return data.habitLogs
    .filter((l) => l.done && learn.has(l.habitId))
    .reduce((s, l) => s + (l.minutes ?? 0), 0);
}

export function computeAchievements(data: AppData, history: DayScore[]): Achievement[] {
  const withData = history.filter((h) => h.lifeScore > 0);
  const bestScore = withData.reduce((m, h) => Math.max(m, h.lifeScore), 0);
  const bestElo = history.reduce((m, h) => Math.max(m, h.elo), data.settings.eloStart);
  const streak = currentStreak(history);
  const longest = longestStreak(history);
  const workouts = data.workouts.length;
  const journal = data.journal.length;
  const goalsDone = data.goals.filter((g) => g.progress >= 100).length;
  const totals = financeTotals(data.finances);
  const savings = bestMonthlySavings(data);
  const learnH = Math.round(learningMinutes(data) / 60);

  const defs: Omit<Achievement, "unlocked">[] = [
    { id: "first", title: "First steps", description: "Log your first day", icon: "🌱", current: Math.min(withData.length, 1), target: 1 },
    { id: "streak7", title: "Consistent", description: "7-day activity streak", icon: "🔥", current: Math.max(streak, longest >= 7 ? 7 : longest), target: 7 },
    { id: "streak30", title: "Unstoppable", description: "30-day activity streak", icon: "⚡", current: Math.min(longest, 30), target: 30 },
    { id: "score90", title: "Peak day", description: "Reach a Life Score of 90", icon: "🌟", current: bestScore, target: 90 },
    { id: "elo1100", title: "Rising", description: "Reach 1100 Life Rating", icon: "📈", current: bestElo, target: 1100 },
    { id: "elo1300", title: "Elite", description: "Reach 1300 Life Rating", icon: "👑", current: bestElo, target: 1300 },
    { id: "gym10", title: "Getting strong", description: "Log 10 workouts", icon: "💪", current: workouts, target: 10 },
    { id: "gym50", title: "Iron discipline", description: "Log 50 workouts", icon: "🏋️", current: workouts, target: 50 },
    { id: "learn100", title: "Scholar", description: "Study 100 hours", icon: "📚", current: learnH, target: 100 },
    { id: "journal30", title: "Chronicler", description: "Write 30 journal entries", icon: "📖", current: journal, target: 30 },
    { id: "sleepweek", title: "Well rested", description: "Average 8h sleep over a week", icon: "😴", current: Math.round(bestSleepWeekAvg(data) / 60 * 10) / 10, target: 8 },
    { id: "saver", title: "Saver", description: "Hit a 30% savings rate in a month", icon: "💰", current: savings, target: 30 },
    { id: "networth", title: "In the black", description: "Reach a positive net worth", icon: "🏦", current: totals.netWorth > 0 ? 1 : 0, target: 1 },
    { id: "goal", title: "Goal getter", description: "Complete a goal", icon: "🎯", current: goalsDone, target: 1 },
  ];

  return defs.map((d) => ({ ...d, unlocked: d.current >= d.target }));
}

export function computeRecords(data: AppData, history: DayScore[]): Record[] {
  const withData = history.filter((h) => h.lifeScore > 0);
  const bestScore = withData.reduce((m, h) => Math.max(m, h.lifeScore), 0);
  const bestElo = history.reduce((m, h) => Math.max(m, h.elo), data.settings.eloStart);
  const longest = longestStreak(history);
  const sleepWeek = bestSleepWeekAvg(data);
  const savings = bestMonthlySavings(data);
  const wkWeek = mostWorkoutsInWeek(data);

  const recs: Record[] = [
    { id: "score", label: "Highest Life Score", value: bestScore ? String(bestScore) : "—", icon: "⭐" },
    { id: "elo", label: "Highest Life Rating", value: bestElo.toLocaleString(), icon: "🏆" },
    { id: "streak", label: "Longest streak", value: longest ? `${longest} d` : "—", icon: "🔥" },
    { id: "sleep", label: "Best sleep week", value: sleepWeek ? `${(sleepWeek / 60).toFixed(1)} h` : "—", icon: "😴" },
    { id: "savings", label: "Highest monthly savings rate", value: savings ? `${savings}%` : "—", icon: "💰" },
    { id: "workouts", label: "Most workouts in a week", value: wkWeek ? String(wkWeek) : "—", icon: "💪" },
  ];
  return recs;
}

export function todayMonthSavings(data: AppData): number {
  return budgetForMonth(data.finances.transactions, currentMonth()).savingsRate;
}
