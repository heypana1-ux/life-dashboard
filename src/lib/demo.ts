import { AppData, DailyReview, Habit, HabitLog, JournalEntry, SleepLog } from "./types";
import { addDays, todayISO, weekdayOf } from "./date";
import { starterHabits, uid } from "./defaults";

/*
  Deterministic-ish demo generator. Produces ~45 days of realistic, internally-correlated
  data so charts, ELO and the insights engine are immediately meaningful and testable.
  Built-in signals the insights engine can rediscover:
    - more sleep  -> better next-day energy / productivity
    - training days -> better mood
    - weekends -> more "reduce" habit slips
*/

// tiny seeded PRNG so demo data is stable across reloads
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAYS = 45;

export function generateDemo(base: AppData): AppData {
  const rnd = mulberry32(20260810);
  const enabled = new Set(base.settings.areas.filter((a) => a.enabled).map((a) => a.key));
  const habits: Habit[] = starterHabits(enabled);

  const end = todayISO();
  const start = addDays(end, -(DAYS - 1));

  const habitLogs: HabitLog[] = [];
  const reviews: DailyReview[] = [];
  const sleep: SleepLog[] = [];
  const journal: JournalEntry[] = [];

  // consistency drifts upward over time (simulate improvement) with noise
  for (let i = 0; i < DAYS; i++) {
    const date = addDays(start, i);
    const wd = weekdayOf(date);
    const isWeekend = wd === 0 || wd === 6;
    const progress = i / DAYS; // 0..1 improvement trend

    // --- sleep ---
    const baseSleep = 7.4 + progress * 0.6 + (isWeekend ? 0.5 : 0) + (rnd() - 0.5) * 1.4;
    const sleepH = Math.max(5, Math.min(9.5, baseSleep));
    const bedHour = 23 + (rnd() - 0.5) * 1.6 + (isWeekend ? 0.6 : 0);
    const bedM = Math.round(((bedHour % 1) * 60) / 5) * 5;
    const bedTime = `${String(Math.floor(bedHour) % 24).padStart(2, "0")}:${String(
      ((bedM % 60) + 60) % 60,
    ).padStart(2, "0")}`;
    const wakeTotal = (Math.floor(bedHour) * 60 + bedM + sleepH * 60) % (24 * 60);
    const wh = Math.floor(wakeTotal / 60);
    const wm = Math.round((wakeTotal % 60) / 5) * 5;
    const wakeTime = `${String(wh).padStart(2, "0")}:${String(((wm % 60) + 60) % 60).padStart(2, "0")}`;
    const quality = clampi(Math.round(5 + (sleepH - 7) * 1.6 + (rnd() - 0.5) * 2), 1, 10);
    const morningEnergy = clampi(Math.round(4 + (sleepH - 7) * 1.7 + (rnd() - 0.5) * 2), 1, 10);
    if (enabled.has("sleep")) {
      sleep.push({
        date,
        bedTime,
        wakeTime,
        fallAsleepMinutes: Math.round(10 + rnd() * 20),
        awakenings: rnd() > 0.7 ? 1 : 0,
        quality,
        morningEnergy,
      });
    }

    // --- habits ---
    let trainedToday = false;
    for (const h of habits) {
      if (h.kind === "build") {
        const due = isDue(h, wd);
        // weekly habits: decide on ~timesPerWeek/7 chance, biased by progress
        const dueChance =
          h.schedule.type === "weekly"
            ? (h.schedule.timesPerWeek ?? 3) / 7
            : due
              ? 1
              : 0;
        if (dueChance === 0) continue;
        const p = clampf(0.55 + progress * 0.3 + (h.priority === "high" ? 0.1 : 0) - (isWeekend ? 0.08 : 0));
        const done = rnd() < p * dueChance || (dueChance < 1 && rnd() < p * dueChance);
        if (done) {
          if (h.area === "sport") trainedToday = true;
          habitLogs.push({
            habitId: h.id,
            date,
            done: true,
            minutes: h.targetMinutes
              ? Math.round(h.targetMinutes * (0.7 + rnd() * 0.6))
              : undefined,
            value: h.targetValue
              ? Math.round(h.targetValue * (0.6 + rnd() * 0.7))
              : undefined,
          });
        } else if (due) {
          habitLogs.push({ habitId: h.id, date, done: false });
        }
      } else {
        // reduce habit: slip more on weekends, less as progress improves
        const slip = clampf(0.28 + (isWeekend ? 0.22 : 0) - progress * 0.2);
        const occurred = rnd() < slip;
        habitLogs.push({ habitId: h.id, date, done: occurred });
      }
    }

    // --- daily review (correlated with sleep + training) ---
    if (enabled.has("reflection")) {
      const energy = clampi(Math.round(morningEnergy + (trainedToday ? 1 : 0) + (rnd() - 0.5) * 2), 1, 10);
      const productivity = clampi(
        Math.round(4.5 + (sleepH - 7) * 1.2 + (trainedToday ? 1 : 0) + progress * 1.2 + (rnd() - 0.5) * 2),
        1,
        10,
      );
      const mood = clampi(Math.round(5 + (trainedToday ? 1.5 : 0) + (sleepH - 7) + (rnd() - 0.5) * 2), 1, 10);
      const satisfaction = clampi(Math.round((productivity + mood + energy) / 3 + (rnd() - 0.5) * 1.5), 1, 10);
      const discipline = clampi(Math.round(4.5 + progress * 1.5 + (rnd() - 0.5) * 2.5), 1, 10);
      reviews.push({ date, productivity, mood, energy, satisfaction, discipline });
    }

    // --- occasional journal entries ---
    if (enabled.has("reflection") && (i % 4 === 0 || rnd() > 0.8)) {
      journal.push(sampleJournal(date, quality, trainedToday));
    }
  }

  return {
    ...base,
    habits,
    habitLogs,
    reviews,
    sleep,
    journal: [...base.journal, ...journal],
    settings: { ...base.settings, demoDataLoaded: true, onboardingComplete: true },
  };
}

/** Remove everything the demo generator produced, keeping only user-created records. */
export function clearDemo(data: AppData): AppData {
  // Simplest correct behavior for MVP: demo fully populates a fresh dataset,
  // so clearing demo resets logs/habits generated with it.
  return {
    ...data,
    habits: [],
    habitLogs: [],
    reviews: [],
    sleep: [],
    journal: [],
    goals: [],
    settings: { ...data.settings, demoDataLoaded: false },
  };
}

function isDue(h: Habit, wd: number): boolean {
  if (h.schedule.type === "daily") return true;
  if (h.schedule.type === "weekdays") return (h.schedule.days ?? []).includes(wd);
  return true; // weekly handled via chance
}

function clampi(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
function clampf(n: number): number {
  return Math.max(0, Math.min(1, n));
}

const JOURNAL_SAMPLES = [
  {
    title: "Steady day",
    body: "Kept to the plan for the most part. Morning felt slow but picked up after the first block of focused work. Noticed I get more done when I start before checking my phone.",
    highlight: "Two hours of uninterrupted deep work.",
  },
  {
    title: "Training paid off",
    body: "Session felt strong today — energy was there from the warmup. Ended the day in a good mood and slept better. Want to keep this rhythm going.",
    highlight: "Hit a new best on the main lift.",
  },
  {
    title: "Slower one",
    body: "Didn't sleep enough and it showed. Concentration was patchy and I leaned on quick distractions more than I'd like. Not a disaster, just a reminder that the night before matters.",
    highlight: "Caught myself and salvaged the evening.",
  },
  {
    title: "Creative flow",
    body: "Spent the evening writing. Words came easily once I stopped judging the first draft. Small progress but it compounds.",
    highlight: "Finished a full verse I'm happy with.",
  },
];

function sampleJournal(date: string, quality: number, trained: boolean): JournalEntry {
  const s =
    trained && quality >= 6
      ? JOURNAL_SAMPLES[1]
      : quality <= 4
        ? JOURNAL_SAMPLES[2]
        : JOURNAL_SAMPLES[(date.charCodeAt(9) + quality) % JOURNAL_SAMPLES.length];
  const now = new Date().toISOString();
  return {
    id: uid("jrnl"),
    date,
    title: s.title,
    body: s.body,
    mood: quality,
    highlight: s.highlight,
    tags: trained ? ["training"] : [],
    createdAt: now,
    updatedAt: now,
  };
}
