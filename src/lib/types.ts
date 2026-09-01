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
  /** 1..5 importance: how much finishing this habit counts toward the Life Score.
   *  Higher = a done/missed day moves that area's score more. Defaults from priority. */
  weight?: number;
  /** For "reduce" habits: how heavily an occurrence hurts the score (1..5). */
  severity?: number;
  color?: string;
  /** Optional habit-stacking group (a routine name, e.g. "Evening routine"). */
  group?: string;
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
  /** For "reduce" slips: an optional trigger/situation, to surface patterns over time. */
  trigger?: string;
  notes?: string;
  /** Local ISO timestamp the habit was last marked done — powers "smart" reminder times. */
  doneAt?: string;
}

/** A single Deep-Work / Pomodoro focus session (logged by the in-app timer or by hand). */
export interface FocusSession {
  id: string;
  date: string; // YYYY-MM-DD (the local day it was completed)
  minutes: number;
  /** What you worked on (free text). */
  label?: string;
  startedAt: string; // ISO timestamp
}

/** One saved AI-coach conversation thread. */
export interface CoachChatMessage {
  role: "user" | "assistant";
  content: string;
}
export interface CoachChatThread {
  id: string;
  title: string;
  messages: CoachChatMessage[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/** A visual goal / "where I want to go" card on the Vision Board. */
export interface VisionItem {
  id: string;
  title: string;
  note?: string;
  /** Small, client-resized image stored as a data: URL. */
  image?: string;
  /** Free-text category / life area, shown as a chip. */
  category?: string;
  /** Optional target year the user is aiming for. */
  targetYear?: number;
  done?: boolean;
  createdAt: string;
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

/** A forward-looking weekly plan: an intention + a few focus habits for the coming week. */
export interface WeeklyPlan {
  weekOf: string; // the Sunday that anchors the week (YYYY-MM-DD)
  intention?: string;
  focusHabitIds?: string[];
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
  /** Public display name / nickname others see on the scoreboard and your profile card. */
  displayName?: string;
  /** Small, client-resized avatar image as a data: URL. */
  avatar?: string;
  /** Whether other people can open your full profile card from the scoreboard. */
  isPublic?: boolean;
}

/** A single body-weight measurement (kept as a time series). */
export interface WeightLog {
  date: string; // YYYY-MM-DD
  kg: number;
}

/** A body circumference measurement (biceps, waist, chest…) kept as a time series.
 *  `site` keys map to a muscle group so girth can be shown next to training progress. */
export interface BodyMeasurement {
  date: string; // YYYY-MM-DD
  site: string; // BodySite key, e.g. "biceps", "waist"
  cm: number;
}

/** A Wheel of Life self-assessment: 1..10 per life dimension, taken periodically. */
export interface WheelCheck {
  id: string;
  date: string; // YYYY-MM-DD
  scores: Record<string, number>; // dimension key -> 1..10
  note?: string;
}

/** Daily health check — tracked and correlated, but never part of the Life Score. */
export interface HealthLog {
  date: string; // YYYY-MM-DD
  /** Overall wellbeing 1..10 — derived from the sub-dimensions below when they're set. */
  wellbeing?: number;
  /** Wellbeing sub-dimensions (1..10). Their average (stress inverted) forms `wellbeing`. */
  physical?: number;
  mental?: number;
  energy?: number;
  /** Stress 1..10 (higher = worse; inverted when averaged into wellbeing). */
  stress?: number;
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

/* ---------------- Reward shop ---------------- */

/** A user-defined real-life reward, unlockable by spending earned points. */
export interface RewardItem {
  id: string;
  name: string;
  cost: number;
  icon?: string; // an emoji
}

/** A record of a reward the user cashed in (points are deducted from the balance). */
export interface Redemption {
  id: string;
  name: string;
  cost: number;
  date: string; // ISO timestamp
}

/** A completed weekly challenge the user claimed for XP. One per (week, challenge). */
export interface ChallengeClaim {
  week: string; // the Sunday anchor (YYYY-MM-DD) of the week it was earned in
  id: string; // the challenge id (e.g. "train", "sleep")
}

/** A completed daily quest the user claimed for points. One per (date, quest). */
export interface QuestClaim {
  date: string; // YYYY-MM-DD it was earned on
  id: string; // the quest id (e.g. "sleep", "checkin")
}

export interface RewardsState {
  items: RewardItem[];
  redemptions: Redemption[];
  /** Cosmetic ids (accent themes) bought with points. Owned = unlocked-by-level OR here. */
  owned?: string[];
  /** Weekly challenges claimed for XP (idempotent per week). */
  challengeClaims?: ChallengeClaim[];
  /** Daily quests claimed for points (idempotent per day). */
  questClaims?: QuestClaim[];
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
  /** Opt-in: real push notifications (delivered even when the app is closed). */
  push?: boolean;
  /** Opt-in weekly recap push, sent Sunday evening (needs push enabled). */
  weeklyRecap?: boolean;
}

export type Accent =
  | "calm"
  | "aurora"
  | "mono"
  | "sunset"
  | "forest"
  | "rose"
  // Cosmetic themes bought with reward points (see rewards.ts / the Reward shop).
  | "ocean"
  | "gold"
  | "crimson"
  | "mint"
  | "grape"
  | "midnight";

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

export interface AvatarConfig {
  skin: string;
  hair: string;
  hairColor: string;
  face: string;
  shirt: string;
  hat: string;
  glasses: string;
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
  /** Daily deep-work / focus target in minutes (drives the focus score bonus + stats). */
  focusTargetMinutes?: number;
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
  /** Target values for body metrics: key "weight" (kg) or a BodySite key (cm). */
  measurementGoals?: { key: string; target: number }[];
  /** Dates that shouldn't break streaks (vacation / planned rest). */
  restDays?: string[];
  /** Vacation ranges: streaks are protected and scoring is lenient (missed habits don't count,
   *  no coverage penalty, and your Life Rating can't drop) across these days. */
  vacations?: { from: string; to: string }[];
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
  /** Short history of recent daily briefings so the coach can follow up on past advice. */
  coachHistory?: { date: string; text: string }[];
  /** Cached once-a-week proactive coach check-in (keyed by the week's Sunday anchor). */
  coachCheckin?: { week: string; text: string };
  /** Cosmetic character/avatar the user builds and unlocks items for. */
  avatar?: AvatarConfig;
  /** Selected Score-ring skin id (see cosmetics.ts). Undefined = the default accent ring. */
  ringSkin?: string;
  /** Selected profile title id shown next to the level (see cosmetics.ts). */
  title?: string;
  /** Selected badge id (emoji flair) shown next to the level (see cosmetics.ts). */
  badge?: string;
  /** Self-reported "about you" answers (question id -> answer) the coach can draw on. */
  about?: Record<string, string>;
  /** Dashboard personalization: hidden card ids and a custom card order. */
  dashboard?: { hidden?: string[]; order?: string[] };
  /** Ids of one-time feature spotlight hints the user has dismissed. */
  hintsSeen?: string[];
  /** Opt-in: let the daily check-in ratings (productivity/mood/energy/…) count lightly toward
   *  the Life Score. Off by default — the check-in is otherwise informational only. */
  checkinCounts?: boolean;
  /** Quick-capture window: which section panels are enabled, and whether the first-run picker
   *  has been completed. */
  quickCapture?: { sections: string[]; configured: boolean };
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
  weeklyPlans: WeeklyPlan[];
  sleep: SleepLog[];
  journal: JournalEntry[];
  goals: Goal[];
  weight: WeightLog[];
  measurements: BodyMeasurement[];
  wheelChecks: WheelCheck[];
  health: HealthLog[];
  focus: FocusDay[];
  /** Logged Deep-Work / Pomodoro sessions (see Focus timer). */
  focusSessions: FocusSession[];
  /** Vision-board cards (visual yearly goals). */
  visionItems: VisionItem[];
  /** Saved AI-coach conversation threads. */
  coachChats: CoachChatThread[];
  finances: Finances;
  workouts: Workout[];
  workoutPlans: WorkoutPlan[];
  projects: Project[];
  experiments: Experiment[];
  rewards: RewardsState;
}
