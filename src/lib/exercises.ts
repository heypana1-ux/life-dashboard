import { PlanExercise } from "./types";

/*
  A bundled strength-training catalogue — no external database needed. Each exercise maps to
  a primary muscle group so progress can be aggregated per muscle. Users can still type any
  custom name; unknown names simply have no muscle tag.
*/

export const MUSCLES = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "forearms",
  "traps",
  "fullbody",
  "cardio",
] as const;
export type Muscle = (typeof MUSCLES)[number];

/** i18n keys for muscle labels. */
export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: "Chest",
  back: "Back / Lats",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
  forearms: "Forearms",
  traps: "Traps",
  fullbody: "Full body",
  cardio: "Cardio",
};

/** How a set of this exercise is counted. */
export type ExerciseMode = "reps" | "time";

export interface CatalogExercise {
  name: string;
  muscle: Muscle;
  /** "time" exercises are held rather than repeated — a plank set is 45 s, not 45 reps. */
  mode?: ExerciseMode;
  /** Moves your own body weight. The log pre-fills your current weight and any plates or
   *  a belt are entered as "+ kg" on top, so the real load is body weight + added. */
  bodyweight?: boolean;
}

const CATALOG: CatalogExercise[] = [
  // Chest
  { name: "Barbell Bench Press", muscle: "chest" },
  { name: "Incline Barbell Bench Press", muscle: "chest" },
  { name: "Dumbbell Bench Press", muscle: "chest" },
  { name: "Incline Dumbbell Press", muscle: "chest" },
  { name: "Decline Bench Press", muscle: "chest" },
  { name: "Chest Fly", muscle: "chest" },
  { name: "Cable Crossover", muscle: "chest" },
  { name: "Machine Chest Press", muscle: "chest" },
  { name: "Push-Up", muscle: "chest", bodyweight: true },
  { name: "Dips (Chest)", muscle: "chest", bodyweight: true },
  { name: "Pec Deck", muscle: "chest" },
  // Back
  { name: "Deadlift", muscle: "back" },
  { name: "Pull-Up", muscle: "back", bodyweight: true },
  { name: "Chin-Up", muscle: "back", bodyweight: true },
  { name: "Lat Pulldown", muscle: "back" },
  { name: "Barbell Row", muscle: "back" },
  { name: "Pendlay Row", muscle: "back" },
  { name: "Dumbbell Row", muscle: "back" },
  { name: "Seated Cable Row", muscle: "back" },
  { name: "T-Bar Row", muscle: "back" },
  { name: "Face Pull", muscle: "back" },
  { name: "Straight-Arm Pulldown", muscle: "back" },
  { name: "Rack Pull", muscle: "back" },
  { name: "Hyperextension", muscle: "back", bodyweight: true },
  // Shoulders
  { name: "Overhead Press", muscle: "shoulders" },
  { name: "Seated Dumbbell Press", muscle: "shoulders" },
  { name: "Arnold Press", muscle: "shoulders" },
  { name: "Lateral Raise", muscle: "shoulders" },
  { name: "Front Raise", muscle: "shoulders" },
  { name: "Rear Delt Fly", muscle: "shoulders" },
  { name: "Upright Row", muscle: "shoulders" },
  { name: "Cable Lateral Raise", muscle: "shoulders" },
  // Biceps
  { name: "Barbell Curl", muscle: "biceps" },
  { name: "Dumbbell Curl", muscle: "biceps" },
  { name: "Hammer Curl", muscle: "biceps" },
  { name: "Preacher Curl", muscle: "biceps" },
  { name: "Incline Dumbbell Curl", muscle: "biceps" },
  { name: "Cable Curl", muscle: "biceps" },
  { name: "Concentration Curl", muscle: "biceps" },
  // Triceps
  { name: "Close-Grip Bench Press", muscle: "triceps" },
  { name: "Triceps Pushdown", muscle: "triceps" },
  { name: "Overhead Triceps Extension", muscle: "triceps" },
  { name: "Skull Crusher", muscle: "triceps" },
  { name: "Dips (Triceps)", muscle: "triceps", bodyweight: true },
  { name: "Triceps Kickback", muscle: "triceps" },
  // Quads
  { name: "Back Squat", muscle: "quads" },
  { name: "Front Squat", muscle: "quads" },
  { name: "Leg Press", muscle: "quads" },
  { name: "Hack Squat", muscle: "quads" },
  { name: "Bulgarian Split Squat", muscle: "quads", bodyweight: true },
  { name: "Lunge", muscle: "quads", bodyweight: true },
  { name: "Leg Extension", muscle: "quads" },
  { name: "Goblet Squat", muscle: "quads" },
  // Hamstrings
  { name: "Romanian Deadlift", muscle: "hamstrings" },
  { name: "Lying Leg Curl", muscle: "hamstrings" },
  { name: "Seated Leg Curl", muscle: "hamstrings" },
  { name: "Good Morning", muscle: "hamstrings" },
  { name: "Stiff-Leg Deadlift", muscle: "hamstrings" },
  { name: "Nordic Curl", muscle: "hamstrings", bodyweight: true },
  // Glutes
  { name: "Hip Thrust", muscle: "glutes" },
  { name: "Glute Bridge", muscle: "glutes", bodyweight: true },
  { name: "Cable Kickback", muscle: "glutes" },
  { name: "Sumo Deadlift", muscle: "glutes" },
  { name: "Step-Up", muscle: "glutes", bodyweight: true },
  // Calves
  { name: "Standing Calf Raise", muscle: "calves" },
  { name: "Seated Calf Raise", muscle: "calves" },
  { name: "Leg Press Calf Raise", muscle: "calves" },
  // Core
  { name: "Plank", muscle: "core", mode: "time", bodyweight: true },
  { name: "Hanging Leg Raise", muscle: "core", bodyweight: true },
  { name: "Cable Crunch", muscle: "core" },
  { name: "Ab Wheel Rollout", muscle: "core", bodyweight: true },
  { name: "Russian Twist", muscle: "core", bodyweight: true },
  { name: "Sit-Up", muscle: "core", bodyweight: true },
  { name: "Crunch", muscle: "core", bodyweight: true },
  { name: "Leg Raise", muscle: "core", bodyweight: true },
  { name: "Side Plank", muscle: "core", mode: "time", bodyweight: true },
  { name: "Hollow Hold", muscle: "core", mode: "time", bodyweight: true },
  { name: "Dead Hang", muscle: "forearms", mode: "time", bodyweight: true },
  { name: "Wall Sit", muscle: "quads", mode: "time", bodyweight: true },
  { name: "Mountain Climber", muscle: "core", bodyweight: true, mode: "time" },
  // Forearms
  { name: "Wrist Curl", muscle: "forearms" },
  { name: "Reverse Curl", muscle: "forearms" },
  { name: "Farmer's Walk", muscle: "forearms", mode: "time" },
  // Traps
  { name: "Barbell Shrug", muscle: "traps" },
  { name: "Dumbbell Shrug", muscle: "traps" },
  // Full body / Olympic
  { name: "Power Clean", muscle: "fullbody" },
  { name: "Clean and Jerk", muscle: "fullbody" },
  { name: "Snatch", muscle: "fullbody" },
  { name: "Kettlebell Swing", muscle: "fullbody" },
  { name: "Thruster", muscle: "fullbody" },
  { name: "Burpee", muscle: "fullbody", bodyweight: true },
  // Cardio
  { name: "Running", muscle: "cardio" },
  { name: "Cycling", muscle: "cardio" },
  { name: "Rowing Machine", muscle: "cardio" },
  { name: "Jump Rope", muscle: "cardio" },
  { name: "Stair Climber", muscle: "cardio" },
  { name: "Elliptical", muscle: "cardio" },
];

export const EXERCISES: CatalogExercise[] = [...CATALOG].sort((a, b) => a.name.localeCompare(b.name));

const BY_NAME = new Map(CATALOG.map((e) => [e.name.toLowerCase(), e] as const));

/** Catalog entry for a name, if we know it. Custom exercises simply aren't in here. */
export function catalogEntry(name: string): CatalogExercise | undefined {
  return BY_NAME.get(name.trim().toLowerCase());
}

/** Is a set of this exercise measured in seconds held rather than reps? */
export function isTimeBased(name: string): boolean {
  return catalogEntry(name)?.mode === "time";
}

/** Does this exercise move your own body weight (so the log should pre-fill it)? */
export function isBodyweight(name: string): boolean {
  return catalogEntry(name)?.bodyweight === true;
}

/** Look up an exercise's muscle group by (case-insensitive) name. */
export function muscleFor(name: string): Muscle | undefined {
  return BY_NAME.get(name.trim().toLowerCase())?.muscle;
}

/** Built-in starter plans the user can add and then customise. */
export const PLAN_TEMPLATES: { name: string; exercises: PlanExercise[] }[] = [
  {
    name: "Push",
    exercises: [
      { name: "Barbell Bench Press", muscle: "chest", sets: 4, targetReps: 6 },
      { name: "Overhead Press", muscle: "shoulders", sets: 3, targetReps: 8 },
      { name: "Incline Dumbbell Press", muscle: "chest", sets: 3, targetReps: 10 },
      { name: "Lateral Raise", muscle: "shoulders", sets: 3, targetReps: 15 },
      { name: "Triceps Pushdown", muscle: "triceps", sets: 3, targetReps: 12 },
    ],
  },
  {
    name: "Pull",
    exercises: [
      { name: "Deadlift", muscle: "back", sets: 3, targetReps: 5 },
      { name: "Pull-Up", muscle: "back", sets: 4, targetReps: 8 },
      { name: "Barbell Row", muscle: "back", sets: 3, targetReps: 8 },
      { name: "Face Pull", muscle: "back", sets: 3, targetReps: 15 },
      { name: "Barbell Curl", muscle: "biceps", sets: 3, targetReps: 10 },
    ],
  },
  {
    name: "Legs",
    exercises: [
      { name: "Back Squat", muscle: "quads", sets: 4, targetReps: 6 },
      { name: "Romanian Deadlift", muscle: "hamstrings", sets: 3, targetReps: 8 },
      { name: "Leg Press", muscle: "quads", sets: 3, targetReps: 12 },
      { name: "Lying Leg Curl", muscle: "hamstrings", sets: 3, targetReps: 12 },
      { name: "Standing Calf Raise", muscle: "calves", sets: 4, targetReps: 15 },
    ],
  },
  {
    name: "Upper Body",
    exercises: [
      { name: "Barbell Bench Press", muscle: "chest", sets: 4, targetReps: 6 },
      { name: "Barbell Row", muscle: "back", sets: 4, targetReps: 8 },
      { name: "Overhead Press", muscle: "shoulders", sets: 3, targetReps: 8 },
      { name: "Lat Pulldown", muscle: "back", sets: 3, targetReps: 10 },
      { name: "Dumbbell Curl", muscle: "biceps", sets: 3, targetReps: 12 },
      { name: "Triceps Pushdown", muscle: "triceps", sets: 3, targetReps: 12 },
    ],
  },
  {
    name: "Lower Body",
    exercises: [
      { name: "Back Squat", muscle: "quads", sets: 4, targetReps: 6 },
      { name: "Hip Thrust", muscle: "glutes", sets: 3, targetReps: 10 },
      { name: "Romanian Deadlift", muscle: "hamstrings", sets: 3, targetReps: 8 },
      { name: "Leg Extension", muscle: "quads", sets: 3, targetReps: 15 },
      { name: "Standing Calf Raise", muscle: "calves", sets: 4, targetReps: 15 },
    ],
  },
  {
    name: "Full Body",
    exercises: [
      { name: "Back Squat", muscle: "quads", sets: 3, targetReps: 6 },
      { name: "Barbell Bench Press", muscle: "chest", sets: 3, targetReps: 6 },
      { name: "Barbell Row", muscle: "back", sets: 3, targetReps: 8 },
      { name: "Overhead Press", muscle: "shoulders", sets: 3, targetReps: 8 },
      { name: "Plank", muscle: "core", sets: 3, targetReps: 1 },
    ],
  },
];
