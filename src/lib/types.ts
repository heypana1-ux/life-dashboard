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

export const SCHEMA_VERSION = 3;

export type Language = "en" | "de";

/** The major life areas. Each can be toggled on/off by the user. */
export type AreaKey =
  | "productivity"
  | "sport"
  | "sleep"
  | "habits"
  | "learning"
  | "creativity"
  | "reflection"
  | "finances"
  | "health";

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
  /** Optional target number of times to do this per day (graduated credit: less than
   *  target → partial, more than target → a small capped bonus). */
  timesPerDay?: number;
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
  /** For habits with a per-day target: how many times it was done today. */
  count?: number;
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

/** A guided weekly reflection (the Sunday ritual). One per week, keyed by its Sunday anchor. */
export interface WeeklyReview {
  weekOf: string; // the Sunday that anchors the week (YYYY-MM-DD)
  rating: number; // 1..5 — how the week felt overall
  wins?: string;
  challenges?: string;
  focus?: string; // intention for the coming week
  createdAt: string; // ISO timestamp
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
  /** Small, client-resized images stored as data: URLs. */
  photos?: string[];
  location?: string;
  weather?: string;
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
  /** Habits that contribute to this goal (shown with their recent adherence). */
  linkedHabitIds?: string[];
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

/* ---------------- Profile ---------------- */

export interface Profile {
  name?: string;
  birthDate?: string; // YYYY-MM-DD
  sex?: "male" | "female" | "other" | "prefer_not";
  heightCm?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "athlete";
}

/** A single body-weight measurement (kept as a time series). */
export interface WeightLog {
  date: string; // YYYY-MM-DD
  kg: number;
}

/** Daily health check — tracked and correlated, but never part of the Life Score. */
export interface HealthLog {
  date: string; // YYYY-MM-DD
  /** Overall wellbeing 1..10. */
  wellbeing?: number;
  /** Symptom key -> severity 1..3 (mild/moderate/strong); absent = not present. */
  symptoms?: Record<string, number>;
  sick?: boolean;
  /** Glasses of water (or similar hydration count). */
  hydration?: number;
  /** Names of medications/supplements taken today (subset of Settings.medications). */
  meds?: string[];
  /** Menstrual flow that day: 0 none, 1 light, 2 medium, 3 heavy. Only when cycle tracking is on. */
  period?: number;
  /** "Taking it easy" — a recovery day. Also mirrored into restDays so streaks are protected. */
  recovering?: boolean;
  note?: string;
}

/* ---------------- Finances ---------------- */

export type AssetCategory =
  | "bank"
  | "cash"
  | "investment"
  | "realestate"
  | "vehicle"
  | "other";

/** A manually-valued asset or (via negative meaning) tracked separately as a liability. */
export interface FinanceAccount {
  id: string;
  name: string;
  category: AssetCategory;
  value: number; // current value in the user's currency
  note?: string;
}

export interface Liability {
  id: string;
  name: string;
  balance: number; // outstanding debt (positive number)
  monthlyPayment?: number;
  note?: string;
}

export type HoldingKind = "stock" | "etf" | "fund" | "crypto" | "bond" | "other";

export interface Holding {
  id: string;
  name: string;
  ticker?: string;
  kind: HoldingKind;
  quantity: number;
  buyPrice: number; // avg cost per unit
  currentPrice: number; // manually maintained (or via market-data layer)
  /** Optional recurring savings-plan amount per month. */
  monthlyPlan?: number;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: "income" | "expense";
  category: string;
  amount: number; // positive
  note?: string;
}

/** A recurring income/expense that is auto-booked once per month. */
export interface RecurringTx {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number; // positive
  dayOfMonth: number; // 1..31 (clamped to month length when booking)
  note?: string;
  active: boolean;
  /** Month key (YYYY-MM) this rule was last booked for — prevents double booking. */
  lastBooked?: string;
}

/** A monthly spending cap for one expense category. */
export interface Budget {
  category: string;
  limit: number; // per-month limit in the user's currency
}

/** A savings goal tracked manually (emergency fund, holiday…). */
export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  note?: string;
}

/** Auto-recorded net-worth point (one per day it changes) for the history chart. */
export interface NetWorthPoint {
  date: string;
  value: number;
}

export interface Finances {
  currency: string; // e.g. "EUR"
  accounts: FinanceAccount[];
  liabilities: Liability[];
  holdings: Holding[];
  transactions: Transaction[];
  history: NetWorthPoint[];
  /** Recurring booking rules (rent, salary, subscriptions…). */
  recurring: RecurringTx[];
  /** Per-category monthly spending limits. */
  budgets: Budget[];
  /** Manually-tracked savings goals. */
  savingsGoals: SavingsGoal[];
}

/* ---------------- Training ---------------- */

export interface ExerciseSet {
  reps?: number; // actual reps done
  weight?: number; // actual kg
  targetReps?: number; // planned reps
  targetWeight?: number; // planned kg
}

export interface Exercise {
  id: string;
  name: string;
  /** Primary muscle group (from the catalog), used for per-muscle progress. */
  muscle?: string;
  sets: ExerciseSet[];
}

/** One line in a reusable workout plan/template (e.g. a Push day). */
export interface PlanExercise {
  name: string;
  muscle?: string;
  sets?: number;
  targetReps?: number;
  targetWeight?: number;
  /** Rest after each set of this exercise, in seconds (auto-starts in the guided runner). */
  restSec?: number;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  exercises: PlanExercise[];
  createdAt: string;
}

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  sport: string;
  habitId?: string; // optional link to a sport habit
  durationMin: number;
  intensity?: number; // 1..10
  performance?: number; // 1..10
  fun?: number; // 1..10
  energyBefore?: number; // 1..10
  energyAfter?: number; // 1..10
  distanceKm?: number;
  /** Rounds / sessions for combat & interval sports. */
  rounds?: number;
  avgPulse?: number;
  notes?: string;
  exercises: Exercise[];
}

/* ---------------- Project boards ---------------- */

export type BoardKind = "learning" | "creative";

export interface Project {
  id: string;
  board: BoardKind;
  title: string;
  description?: string;
  /** Index into the board's column list. */
  column: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/* ---------------- Life Experiments ---------------- */

export type ExperimentMetric = "lifeScore" | "productivity" | "mood" | "energy" | "sleep";

/** How each day is classified into the "condition met" group. */
export type ExperimentCondition =
  | "bedtimeBefore" // bedtime earlier than `threshold` (minutes from midnight, evening)
  | "sleepAtLeast" // sleep duration >= threshold minutes
  | "trained" // any workout / sport-habit that day
  | "habitDone" // a specific habit (habitId) was done
  | "manual"; // a free, user-defined condition the user marks per day

export interface Experiment {
  id: string;
  title: string;
  hypothesis?: string;
  metric: ExperimentMetric;
  condition: ExperimentCondition;
  /** For bedtimeBefore / sleepAtLeast: a minute value. */
  threshold?: number;
  /** For habitDone. */
  habitId?: string;
  /** For manual conditions: the user's own condition name, e.g. "Nose healed". */
  conditionLabel?: string;
  /** For manual conditions: the dates the user marked the condition as true. */
  manualDates?: string[];
  /** Legacy: forward-looking start date. Evaluation is now a retrospective lookback. */
  startDate?: string; // YYYY-MM-DD
  days: number; // lookback window length (last N days ending today)
  createdAt: string;
}

/* ---------------- Settings ---------------- */

export interface ReminderSettings {
  enabled: boolean;
  /** Daily check-in reminder time "HH:MM". */
  checkinTime?: string;
  /** Whether to remind about still-open habits at the check-in time. */
  habitReminders: boolean;
  /** ISO dates on which reminders already fired (debounce). */
  firedToday: string[];
}

export type Accent = "calm" | "aurora" | "mono";

/** Optional guided day-flow overlays (evening wrap-up + morning sleep prompt). */
export interface DayFlowSettings {
  eveningEnabled: boolean;
  /** Evening window "HH:MM" — may wrap past midnight (e.g. 20:00 → 03:00). */
  eveningFrom: string;
  eveningTo: string;
  morningEnabled: boolean;
  morningFrom: string;
  morningTo: string;
  /** YYYY-MM-DD the evening / morning flow was last shown (once-per-day debounce). */
  lastEvening?: string;
  lastMorning?: string;
  /** Show the weekly (Sunday) / monthly (1st) animated recap automatically. */
  recapsEnabled?: boolean;
  /** Debounce markers: the Sunday date the weekly recap last ran, and the YYYY-MM the monthly ran. */
  lastWeekly?: string;
  lastMonthly?: string;
  /** The Sunday anchor (YYYY-MM-DD) the guided weekly review was last prompted for. */
  lastGuidedReview?: string;
}

export interface Settings {
  onboardingComplete: boolean;
  theme: "light" | "dark" | "system";
  /** UI density: cozy (default) or compact (tighter cards/spacing). */
  density?: "cozy" | "compact";
  accent: Accent;
  language: Language;
  areas: AreaConfig[];
  /** Personal sleep target in minutes (the user's chosen goal). */
  sleepTargetMinutes: number;
  /** ELO starting/current tracking is derived, but we persist the seed. */
  eloStart: number;
  demoDataLoaded: boolean;
  profile: Profile;
  reminders: ReminderSettings;
  /** Last time the Morning screen auto-opened (YYYY-MM-DD). */
  lastMorningShown?: string;
  /** Last data export/backup (ISO date). */
  lastBackupAt?: string;
  /** Custom ordering of the sidebar/navigation by href. Missing items fall back to default order. */
  navOrder?: string[];
  /** Pages pinned to the mobile bottom bar (hrefs). Falls back to a sensible default set. */
  navPinned?: string[];
  /** Guided day-flow overlays. */
  dayFlow?: DayFlowSettings;
  /** How the Health screen collects data: a guided Q&A or a plain form. */
  healthMode?: "questions" | "form";
  /** Medications / supplements the user tracks daily (shown as quick chips on Health). */
  medications?: string[];
  /** Opt-in menstrual cycle tracking on the Health screen. */
  cycleTracking?: boolean;
  /** Opt-in weekly distance goal (km) for endurance sports; shown on Training. */
  weeklyKmGoal?: number;
  /** Opt-in daily water goal (glasses); shown as a quick tracker on Health. */
  waterGoalGlasses?: number;
  /** Dates that shouldn't break streaks (vacation / planned rest). */
  restDays?: string[];
  /** How many missed days a streak tolerates before breaking (streak protection). */
  streakGrace?: number;
  /** Whether the first-run mini tour has been completed/dismissed. */
  tourDone?: boolean;
  /** Opt-in: send derived (never raw) data to the AI coach provider. Off until enabled. */
  aiCoachEnabled?: boolean;
  /** Opt-in: also let the AI read your journal entries (text, mood, tags) for deeper help. */
  aiJournalAccess?: boolean;
  /** Cached once-per-day coach briefing so it isn't re-generated on every visit. */
  coachBriefing?: { date: string; text: string };
  /** Self-reported "about you" answers (question id -> answer) the coach can draw on. */
  about?: Record<string, string>;
}

/** Optional "top 3 for today" focus items shown on the morning screen. */
export interface FocusDay {
  date: string; // YYYY-MM-DD
  items: { id: string; text: string; done: boolean }[];
}

export interface AppData {
  schemaVersion: number;
  settings: Settings;
  habits: Habit[];
  habitLogs: HabitLog[];
  reviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  sleep: SleepLog[];
  journal: JournalEntry[];
  goals: Goal[];
  weight: WeightLog[];
  health: HealthLog[];
  focus: FocusDay[];
  finances: Finances;
  workouts: Workout[];
  workoutPlans: WorkoutPlan[];
  projects: Project[];
  experiments: Experiment[];
}
