import { AppData, AreaConfig, AreaKey, Habit, Settings, SCHEMA_VERSION } from "./types";
import { todayISO } from "./date";

export const AREA_LABELS: Record<AreaKey, string> = {
  productivity: "Productivity",
  sport: "Sport",
  sleep: "Sleep",
  habits: "Habits",
  learning: "Learning",
  creativity: "Creativity",
  reflection: "Reflection",
  finances: "Finances",
};

/** Default weights (sum = 100). Finances off by default in MVP (manual, no logging engine yet). */
export const DEFAULT_AREAS: AreaConfig[] = [
  { key: "productivity", label: AREA_LABELS.productivity, enabled: true, weight: 20 },
  { key: "sport", label: AREA_LABELS.sport, enabled: true, weight: 15 },
  { key: "sleep", label: AREA_LABELS.sleep, enabled: true, weight: 20 },
  { key: "habits", label: AREA_LABELS.habits, enabled: true, weight: 15 },
  { key: "learning", label: AREA_LABELS.learning, enabled: true, weight: 10 },
  { key: "creativity", label: AREA_LABELS.creativity, enabled: true, weight: 10 },
  { key: "reflection", label: AREA_LABELS.reflection, enabled: true, weight: 10 },
  { key: "finances", label: AREA_LABELS.finances, enabled: false, weight: 0 },
];

/** Common sports offered during onboarding / habit creation. Users can add their own. */
export const DEFAULT_SPORTS = [
  "Strength Training",
  "Running",
  "Cycling",
  "Swimming",
  "Football",
  "Basketball",
  "Taekwondo",
  "Martial Arts",
  "Yoga",
  "Mobility",
  "Stretching",
  "Hiking",
];

export const HABIT_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#9333ea",
  "#0891b2",
  "#db2777",
];

export function defaultSettings(): Settings {
  return {
    onboardingComplete: false,
    theme: "system",
    accent: "calm",
    language: "en",
    areas: DEFAULT_AREAS.map((a) => ({ ...a })),
    sleepTargetMinutes: 8 * 60,
    eloStart: 1000,
    demoDataLoaded: false,
    profile: {},
    reminders: { enabled: false, checkinTime: "21:00", habitReminders: true, firedToday: [] },
    dayFlow: {
      eveningEnabled: false,
      eveningFrom: "20:00",
      eveningTo: "03:00",
      morningEnabled: false,
      morningFrom: "04:00",
      morningTo: "11:00",
    },
  };
}

export function emptyFinances(): AppData["finances"] {
  return {
    currency: "EUR",
    accounts: [],
    liabilities: [],
    holdings: [],
    transactions: [],
    history: [],
  };
}

export function emptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: defaultSettings(),
    habits: [],
    habitLogs: [],
    reviews: [],
    sleep: [],
    journal: [],
    goals: [],
    weight: [],
    finances: emptyFinances(),
    workouts: [],
    projects: [],
    experiments: [],
  };
}

let idc = 0;
export function uid(prefix = "id"): string {
  idc += 1;
  return `${prefix}_${Date.now().toString(36)}_${idc.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/** A starter set of habits created when the user finishes onboarding (respecting enabled areas). */
export function starterHabits(enabled: Set<AreaKey>): Habit[] {
  const now = todayISO();
  const mk = (h: Omit<Habit, "id" | "createdAt" | "archived">): Habit => ({
    ...h,
    id: uid("habit"),
    createdAt: now,
    archived: false,
  });

  const all: Habit[] = [
    mk({
      name: "Strength Training",
      area: "sport",
      kind: "build",
      schedule: { type: "weekly", timesPerWeek: 3 },
      targetMinutes: 60,
      priority: "high",
      difficulty: 4,
      color: HABIT_COLORS[0],
    }),
    mk({
      name: "10,000 steps",
      area: "sport",
      kind: "build",
      schedule: { type: "daily" },
      targetValue: 10000,
      unit: "steps",
      priority: "medium",
      difficulty: 2,
      color: HABIT_COLORS[1],
    }),
    mk({
      name: "Deep work",
      area: "productivity",
      kind: "build",
      schedule: { type: "weekdays", days: [1, 2, 3, 4, 5] },
      targetMinutes: 90,
      priority: "high",
      difficulty: 3,
      color: HABIT_COLORS[2],
    }),
    mk({
      name: "Study session",
      area: "learning",
      kind: "build",
      schedule: { type: "weekly", timesPerWeek: 4 },
      targetMinutes: 60,
      priority: "medium",
      difficulty: 3,
      color: HABIT_COLORS[3],
    }),
    mk({
      name: "Creative session",
      area: "creativity",
      kind: "build",
      schedule: { type: "weekly", timesPerWeek: 3 },
      targetMinutes: 45,
      priority: "medium",
      difficulty: 2,
      color: HABIT_COLORS[5],
    }),
    mk({
      name: "No fast food",
      area: "habits",
      kind: "reduce",
      schedule: { type: "daily" },
      priority: "medium",
      difficulty: 3,
      severity: 3,
      color: HABIT_COLORS[4],
    }),
    mk({
      name: "Excessive social media",
      area: "habits",
      kind: "reduce",
      schedule: { type: "daily" },
      priority: "medium",
      difficulty: 3,
      severity: 2,
      color: HABIT_COLORS[6],
    }),
  ];

  return all.filter((h) => enabled.has(h.area) || h.area === "habits");
}
