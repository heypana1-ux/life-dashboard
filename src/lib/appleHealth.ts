import { AppData, SleepLog, WeightLog, Workout } from "./types";
import { uid } from "./defaults";

/*
  Apple Health import (client-side, privacy-preserving).

  Apple Health has no web API, so the only way a web app can read it is the manual export:
  Health app → profile picture → "Export All Health Data" → a .zip that contains
  `apple_health_export/export.xml`. The user unzips it and uploads that XML here; we parse
  it entirely in the browser and merge sleep, weight and workouts into the dashboard.

  Import is additive and non-destructive: days that already have an entry are kept as-is,
  so manual logs are never overwritten.
*/

export interface HealthImportSummary {
  sleep: number;
  weight: number;
  workouts: number;
  skipped: number;
}

/** Parse "2024-01-31 23:10:00 +0100" → epoch ms (honoring the recorded offset). */
function toMs(s: string): number {
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*([+-]\d{2}):?(\d{2})$/);
  if (!m) return NaN;
  return Date.parse(`${m[1]}T${m[2]}${m[3]}:${m[4]}`);
}
/** Wall-clock date "YYYY-MM-DD" as recorded (no timezone shift). */
function wallDate(s: string): string {
  return s.slice(0, 10);
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

const ACTIVITY_NAMES: Record<string, string> = {
  Running: "Running",
  Walking: "Walking",
  Cycling: "Cycling",
  TraditionalStrengthTraining: "Strength Training",
  FunctionalStrengthTraining: "Strength Training",
  HighIntensityIntervalTraining: "HIIT",
  Yoga: "Yoga",
  Swimming: "Swimming",
  Hiking: "Hiking",
  Elliptical: "Elliptical",
  Rowing: "Rowing",
  CoreTraining: "Core",
  Soccer: "Soccer",
  Basketball: "Basketball",
  Tennis: "Tennis",
};

function sportName(activityType: string): string {
  const key = activityType.replace("HKWorkoutActivityType", "");
  return ACTIVITY_NAMES[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function parseAppleHealth(
  xml: string,
  data: AppData,
): { next: AppData; summary: HealthImportSummary } {
  const summary: HealthImportSummary = { sleep: 0, weight: 0, workouts: 0, skipped: 0 };

  // ---- Weight (BodyMass) — latest value per day ----
  const weightByDay = new Map<string, number>();
  // ---- Sleep — aggregate asleep segments per morning ----
  const nights = new Map<string, { start: number; end: number; minutes: number }>();

  const recRe = /<Record\s+([^>]*?)\/?>/g;
  let rec: RegExpExecArray | null;
  while ((rec = recRe.exec(xml))) {
    const tag = rec[1];
    const type = attr(tag, "type");
    if (!type) continue;

    if (type === "HKQuantityTypeIdentifierBodyMass") {
      const start = attr(tag, "startDate");
      const value = Number(attr(tag, "value"));
      if (!start || !isFinite(value)) continue;
      const unit = attr(tag, "unit") ?? "kg";
      const kg = unit.toLowerCase().includes("lb") ? value * 0.453592 : value;
      weightByDay.set(wallDate(start), Math.round(kg * 10) / 10); // later record wins
    } else if (type === "HKCategoryTypeIdentifierSleepAnalysis") {
      const value = attr(tag, "value") ?? "";
      // Only count segments actually asleep (ignore "InBed" and "Awake").
      if (!value.includes("Asleep")) continue;
      const start = attr(tag, "startDate");
      const end = attr(tag, "endDate");
      if (!start || !end) continue;
      const sMs = toMs(start);
      const eMs = toMs(end);
      if (!isFinite(sMs) || !isFinite(eMs) || eMs <= sMs) continue;
      const morning = wallDate(end); // the day you woke up
      const cur = nights.get(morning) ?? { start: sMs, end: eMs, minutes: 0 };
      cur.start = Math.min(cur.start, sMs);
      cur.end = Math.max(cur.end, eMs);
      cur.minutes += (eMs - sMs) / 60000;
      nights.set(morning, cur);
    }
  }

  // ---- Workouts ----
  const importedWorkouts: Workout[] = [];
  const existingWorkoutKeys = new Set(
    data.workouts.map((w) => `${w.date}|${w.sport}|${Math.round(w.durationMin)}`),
  );
  const wRe = /<Workout\s+([^>]*?)>/g;
  let wk: RegExpExecArray | null;
  while ((wk = wRe.exec(xml))) {
    const tag = wk[1];
    const activity = attr(tag, "workoutActivityType");
    const start = attr(tag, "startDate");
    if (!activity || !start) continue;
    const durAttr = Number(attr(tag, "duration"));
    const durUnit = attr(tag, "durationUnit") ?? "min";
    const durationMin = Math.round(durUnit.startsWith("min") ? durAttr : durAttr * (durUnit.startsWith("h") ? 60 : 1));
    if (!isFinite(durationMin) || durationMin <= 0) continue;
    const sport = sportName(activity);
    const date = wallDate(start);
    const key = `${date}|${sport}|${durationMin}`;
    if (existingWorkoutKeys.has(key)) {
      summary.skipped++;
      continue;
    }
    existingWorkoutKeys.add(key);
    const dist = Number(attr(tag, "totalDistance"));
    const distUnit = (attr(tag, "totalDistanceUnit") ?? "km").toLowerCase();
    const distanceKm = isFinite(dist) && dist > 0 ? (distUnit.includes("mi") ? dist * 1.60934 : dist) : undefined;
    importedWorkouts.push({
      id: uid("wk"),
      date,
      sport,
      durationMin,
      exercises: [],
      ...(distanceKm ? { distanceKm: Math.round(distanceKm * 100) / 100 } : {}),
    });
    summary.workouts++;
  }

  // ---- Merge weight (skip days that already exist) ----
  const existingWeightDates = new Set(data.weight.map((w) => w.date));
  const newWeight: WeightLog[] = [];
  for (const [date, kg] of weightByDay) {
    if (existingWeightDates.has(date)) {
      summary.skipped++;
      continue;
    }
    newWeight.push({ date, kg });
    summary.weight++;
  }

  // ---- Merge sleep (skip nights that already exist) ----
  const existingSleepDates = new Set(data.sleep.map((s) => s.date));
  const newSleep: SleepLog[] = [];
  for (const [morning, n] of nights) {
    if (existingSleepDates.has(morning)) {
      summary.skipped++;
      continue;
    }
    // Guard against implausible aggregates.
    if (n.minutes < 60 || n.minutes > 16 * 60) {
      summary.skipped++;
      continue;
    }
    newSleep.push({
      date: morning,
      bedTime: msToLocalHHMM(n.start),
      wakeTime: msToLocalHHMM(n.end),
      fallAsleepMinutes: 0,
      awakenings: 0,
      quality: 7,
      morningEnergy: 7,
    });
    summary.sleep++;
  }

  const next: AppData = {
    ...data,
    weight: [...data.weight, ...newWeight].sort((a, b) => (a.date < b.date ? -1 : 1)),
    sleep: [...data.sleep, ...newSleep].sort((a, b) => (a.date < b.date ? -1 : 1)),
    workouts: [...data.workouts, ...importedWorkouts].sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
  return { next, summary };
}

/** Local wall-clock HH:MM for an epoch ms (uses the browser's timezone). */
function msToLocalHHMM(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
