/**
 * Core data model for Life Dashboard.
 *
 * Design goals:
 *  - Flexible & extensible: new life areas can be added without breaking old data.
 *  - Self-describing logs keyed by ISO date (YYYY-MM-DD) for easy time-series work.
 *  - Everything the scoring / ELO / insights engines need is derivable from these records.
 *
 * Persistence in this MVP is local (localStorage) via the store. The shapes below are
 * intentionally serialization-friendly so the same model can later back a real database.
 */

export const SCHEMA_VERSION = 1;

/** The major life areas. Each can be toggled on/off by the user. */
export type AreaKey =
  | "productivity"
  | "sport"
  | "sleep"
  | "habits"
  | "learning"
  | "creativity"
  | "reflection"
  | "finances";

export interface AreaConfig {
  key: AreaKey;
  label: string;
  enabled: boolean;
  /** Relative weight in the Life Score (only enabled areas count; weights are normalized). */
  weight: number;
}

export type Priority = "low" | "medium" | "high";
export type HabitKind = "build" | "reduce"; // reduce = a "negative"/anti-habit

/** Schedule describing when a habit is expected. */
export interface Schedule {
  /** "daily" | "weekly" (target count / week) | "weekdays" (specific days) */
  type: "daily" | "weekly" | "weekdays";
  /** For weekly: how many times per week is the target. */
  timesPerWeek?: number;
  /** For weekdays: 0=Sun ... 6=Sat. */
  days?: number[];
}

export interface Habit {
  id: string;
  name: string;
  area: AreaKey;
  kind: HabitKind;
  schedule: Schedule;
  /** Optional target duration in minutes per occurrence. */
  targetMinutes?: number;
  /** Optional numeric target (e.g. 10000 steps) with a unit label. */
  targetValue?: number;
  unit?: string;
  priority: Priority;
  /** 1..5 subjective difficulty. */
  difficulty: number;
  /** For "reduce" habits: how heavily an occurrence hurts the score (1..5). */
  severity?: number;
  color?: string;
  archived: boolean;
  createdAt: string; // ISO date
}

/** A single day's record for one habit. */
export interface HabitLog {
  habitId: string;
  date: string; // YYYY-MM-DD
  /** For build habits: was it done. For reduce habits: did the behavior occur. */
  done: boolean;
  minutes?: number;
  value?: number;
  notes?: string;
}

/** End-of-day self check-in. */
export interface DailyReview {
  date: string; // YYYY-MM-DD
  productivity: number; // 1..10
  mood: number; // 1..10
  energy: number; // 1..10
  satisfaction: number; // 1..10
  discipline: number; // 1..10
  wentWell?: string;
  wentBad?: string;
  improveTomorrow?: string;
}

/** Manual sleep entry. */
export interface SleepLog {
  date: string; // the morning you woke up (YYYY-MM-DD)
  bedTime: string; // "23:15"
  wakeTime: string; // "07:00"
  fallAsleepMinutes?: number;
  awakenings?: number;
  quality: number; // 1..10
  morningEnergy: number; // 1..10
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  body: string;
  mood?: number; // 1..10
  tags?: string[];
  highlight?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  area: AreaKey | "career" | "travel" | "personal";
  deadline?: string; // YYYY-MM-DD
  progress: number; // 0..100
  milestones: { id: string; label: string; done: boolean }[];
  createdAt: string;
  archived: boolean;
}

/** A computed snapshot for a single day (persisted so ELO/history is stable). */
export interface DayScore {
  date: string;
  lifeScore: number; // 0..100
  categories: Partial<Record<AreaKey, number>>; // 0..100 per enabled area
  elo: number;
  eloDelta: number;
}

export interface Settings {
  onboardingComplete: boolean;
  theme: "light" | "dark" | "system";
  areas: AreaConfig[];
  /** Personal sleep target in minutes (the user's chosen goal). */
  sleepTargetMinutes: number;
  /** ELO starting/current tracking is derived, but we persist the seed. */
  eloStart: number;
  demoDataLoaded: boolean;
}

export interface AppData {
  schemaVersion: number;
  settings: Settings;
  habits: Habit[];
  habitLogs: HabitLog[];
  reviews: DailyReview[];
  sleep: SleepLog[];
  journal: JournalEntry[];
  goals: Goal[];
}
