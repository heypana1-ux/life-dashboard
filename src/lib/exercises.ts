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

export interface CatalogExercise {
  name: string;
  muscle: Muscle;
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
  { name: "Push-Up", muscle: "chest" },
  { name: "Dips (Chest)", muscle: "chest" },
  { name: "Pec Deck", muscle: "chest" },
  // Back
  { name: "Deadlift", muscle: "back" },
  { name: "Pull-Up", muscle: "back" },
  { name: "Chin-Up", muscle: "back" },
  { name: "Lat Pulldown", muscle: "back" },
  { name: "Barbell Row", muscle: "back" },
  { name: "Pendlay Row", muscle: "back" },
  { name: "Dumbbell Row", muscle: "back" },
  { name: "Seated Cable Row", muscle: "back" },
  { name: "T-Bar Row", muscle: "back" },
  { name: "Face Pull", muscle: "back" },
  { name: "Straight-Arm Pulldown", muscle: "back" },
  { name: "Rack Pull", muscle: "back" },
  { name: "Hyperextension", muscle: "back" },
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
  { name: "Dips (Triceps)", muscle: "triceps" },
  { name: "Triceps Kickback", muscle: "triceps" },
  // Quads
  { name: "Back Squat", muscle: "quads" },
  { name: "Front Squat", muscle: "quads" },
  { name: "Leg Press", muscle: "quads" },
  { name: "Hack Squat", muscle: "quads" },
  { name: "Bulgarian Split Squat", muscle: "quads" },
  { name: "Lunge", muscle: "quads" },
  { name: "Leg Extension", muscle: "quads" },
  { name: "Goblet Squat", muscle: "quads" },
  // Hamstrings
  { name: "Romanian Deadlift", muscle: "hamstrings" },
  { name: "Lying Leg Curl", muscle: "hamstrings" },
  { name: "Seated Leg Curl", muscle: "hamstrings" },
  { name: "Good Morning", muscle: "hamstrings" },
  { name: "Stiff-Leg Deadlift", muscle: "hamstrings" },
  { name: "Nordic Curl", muscle: "hamstrings" },
  // Glutes
  { name: "Hip Thrust", muscle: "glutes" },
  { name: "Glute Bridge", muscle: "glutes" },
  { name: "Cable Kickback", muscle: "glutes" },
  { name: "Sumo Deadlift", muscle: "glutes" },
  { name: "Step-Up", muscle: "glutes" },
  // Calves
  { name: "Standing Calf Raise", muscle: "calves" },
  { name: "Seated Calf Raise", muscle: "calves" },
  { name: "Leg Press Calf Raise", muscle: "calves" },
  // Core
  { name: "Plank", muscle: "core" },
  { name: "Hanging Leg Raise", muscle: "core" },
  { name: "Cable Crunch", muscle: "core" },
  { name: "Ab Wheel Rollout", muscle: "core" },
  { name: "Russian Twist", muscle: "core" },
  { name: "Sit-Up", muscle: "core" },
  { name: "Crunch", muscle: "core" },
  { name: "Leg Raise", muscle: "core" },
  { name: "Mountain Climber", muscle: "core" },
  // Forearms
  { name: "Wrist Curl", muscle: "forearms" },
  { name: "Reverse Curl", muscle: "forearms" },
  { name: "Farmer's Walk", muscle: "forearms" },
  // Traps
  { name: "Barbell Shrug", muscle: "traps" },
  { name: "Dumbbell Shrug", muscle: "traps" },
  // Full body / Olympic
  { name: "Power Clean", muscle: "fullbody" },
  { name: "Clean and Jerk", muscle: "fullbody" },
  { name: "Snatch", muscle: "fullbody" },
  { name: "Kettlebell Swing", muscle: "fullbody" },
  { name: "Thruster", muscle: "fullbody" },
  { name: "Burpee", muscle: "fullbody" },
  // Cardio
  { name: "Running", muscle: "cardio" },
  { name: "Cycling", muscle: "cardio" },
  { name: "Rowing Machine", muscle: "cardio" },
  { name: "Jump Rope", muscle: "cardio" },
  { name: "Stair Climber", muscle: "cardio" },
  { name: "Elliptical", muscle: "cardio" },
];

export const EXERCISES: CatalogExercise[] = [...CATALOG].sort((a, b) => a.name.localeCompare(b.name));

const BY_NAME = new Map(EXERCISES.map((e) => [e.name.toLowerCase(), e.muscle] as const));

/** Look up an exercise's muscle group by (case-insensitive) name. */
export function muscleFor(name: string): Muscle | undefined {
  return BY_NAME.get(name.trim().toLowerCase());
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
