import { Habit } from "./types";
import { HABIT_COLORS } from "./defaults";

/*
  Ready-made habit and goal templates for a fast start. Labels are English keys so they run
  through i18n; users edit anything after adding.
*/

export type HabitTemplate = Omit<Habit, "id" | "createdAt" | "archived">;

const c = (i: number) => HABIT_COLORS[i % HABIT_COLORS.length];

export const HABIT_TEMPLATE_GROUPS: { group: string; items: HabitTemplate[] }[] = [
  {
    group: "Sport & body",
    items: [
      { name: "Strength Training", area: "sport", kind: "build", schedule: { type: "weekly", timesPerWeek: 3 }, targetMinutes: 60, priority: "high", difficulty: 3, color: c(0) },
      { name: "Cardio / Run", area: "sport", kind: "build", schedule: { type: "weekly", timesPerWeek: 2 }, targetMinutes: 30, priority: "medium", difficulty: 3, color: c(1) },
      { name: "10,000 steps", area: "sport", kind: "build", schedule: { type: "daily" }, targetValue: 10000, unit: "steps", priority: "medium", difficulty: 2, color: c(2) },
      { name: "Stretch / mobility", area: "sport", kind: "build", schedule: { type: "daily" }, targetMinutes: 10, priority: "low", difficulty: 1, color: c(6) },
      { name: "Yoga", area: "sport", kind: "build", schedule: { type: "weekly", timesPerWeek: 2 }, targetMinutes: 20, priority: "low", difficulty: 2, color: c(5) },
      { name: "Walk outside", area: "sport", kind: "build", schedule: { type: "daily" }, targetMinutes: 20, priority: "medium", difficulty: 1, color: c(2) },
      { name: "Cold shower", area: "health", kind: "build", schedule: { type: "daily" }, priority: "low", difficulty: 2, color: c(1) },
      { name: "Good posture check", area: "health", kind: "build", schedule: { type: "daily" }, priority: "low", difficulty: 1, color: c(6) },
    ],
  },
  {
    group: "Productivity & mind",
    items: [
      { name: "Deep work block", area: "productivity", kind: "build", schedule: { type: "daily" }, targetMinutes: 90, priority: "high", difficulty: 4, color: c(0) },
      { name: "Read", area: "learning", kind: "build", schedule: { type: "daily" }, targetMinutes: 20, priority: "medium", difficulty: 2, color: c(3) },
      { name: "Study / learn a skill", area: "learning", kind: "build", schedule: { type: "weekly", timesPerWeek: 4 }, targetMinutes: 30, priority: "medium", difficulty: 3, color: c(1) },
      { name: "Meditate", area: "reflection", kind: "build", schedule: { type: "daily" }, targetMinutes: 10, priority: "medium", difficulty: 2, color: c(5) },
      { name: "Plan tomorrow", area: "productivity", kind: "build", schedule: { type: "daily" }, priority: "low", difficulty: 1, color: c(2) },
      { name: "Learn a language", area: "learning", kind: "build", schedule: { type: "daily" }, targetMinutes: 15, priority: "medium", difficulty: 2, color: c(3) },
      { name: "Single-task, no multitasking", area: "productivity", kind: "build", schedule: { type: "weekdays", days: [1, 2, 3, 4, 5] }, priority: "medium", difficulty: 3, color: c(0) },
      { name: "Practice an instrument", area: "creativity", kind: "build", schedule: { type: "weekly", timesPerWeek: 3 }, targetMinutes: 20, priority: "low", difficulty: 2, color: c(7) },
      { name: "Write / create", area: "creativity", kind: "build", schedule: { type: "weekly", timesPerWeek: 3 }, targetMinutes: 20, priority: "medium", difficulty: 3, color: c(7) },
    ],
  },
  {
    group: "Sleep & recovery",
    items: [
      { name: "In bed by 23:00", area: "health", kind: "build", schedule: { type: "daily" }, priority: "high", difficulty: 3, color: c(5) },
      { name: "No screens 30 min before bed", area: "health", kind: "build", schedule: { type: "daily" }, priority: "medium", difficulty: 3, color: c(5) },
      { name: "Morning sunlight", area: "health", kind: "build", schedule: { type: "daily" }, targetMinutes: 10, priority: "low", difficulty: 1, color: c(2) },
      { name: "Wind-down routine", area: "reflection", kind: "build", schedule: { type: "daily" }, priority: "low", difficulty: 2, color: c(5) },
    ],
  },
  {
    group: "Health & nutrition",
    items: [
      { name: "Drink water", area: "health", kind: "build", schedule: { type: "daily" }, timesPerDay: 6, priority: "medium", difficulty: 1, color: c(1) },
      { name: "Vitamins / supplements", area: "health", kind: "build", schedule: { type: "daily" }, priority: "low", difficulty: 1, color: c(6) },
      { name: "Skincare", area: "health", kind: "build", schedule: { type: "daily" }, timesPerDay: 2, priority: "low", difficulty: 1, color: c(7) },
      { name: "Eat vegetables", area: "health", kind: "build", schedule: { type: "daily" }, priority: "medium", difficulty: 2, color: c(1) },
      { name: "Cook at home", area: "health", kind: "build", schedule: { type: "weekly", timesPerWeek: 5 }, priority: "medium", difficulty: 2, color: c(2) },
      { name: "Floss", area: "health", kind: "build", schedule: { type: "daily" }, priority: "low", difficulty: 1, color: c(6) },
    ],
  },
  {
    group: "Mindfulness & mood",
    items: [
      { name: "Gratitude — 3 good things", area: "reflection", kind: "build", schedule: { type: "daily" }, priority: "medium", difficulty: 1, color: c(5) },
      { name: "Breathing exercise", area: "reflection", kind: "build", schedule: { type: "daily" }, targetMinutes: 5, priority: "low", difficulty: 1, color: c(5) },
      { name: "Journal", area: "reflection", kind: "build", schedule: { type: "daily" }, priority: "medium", difficulty: 2, color: c(3) },
      { name: "Time in nature", area: "reflection", kind: "build", schedule: { type: "weekly", timesPerWeek: 2 }, priority: "low", difficulty: 1, color: c(2) },
    ],
  },
  {
    group: "Money & life",
    items: [
      { name: "Track expenses", area: "finances", kind: "build", schedule: { type: "daily" }, priority: "medium", difficulty: 1, color: c(2) },
      { name: "Review budget weekly", area: "finances", kind: "build", schedule: { type: "weekly", timesPerWeek: 1 }, priority: "medium", difficulty: 1, color: c(2) },
      { name: "Tidy for 10 minutes", area: "productivity", kind: "build", schedule: { type: "daily" }, targetMinutes: 10, priority: "low", difficulty: 1, color: c(6) },
      { name: "Reach out to a friend", area: "reflection", kind: "build", schedule: { type: "weekly", timesPerWeek: 2 }, priority: "low", difficulty: 1, color: c(3) },
    ],
  },
  {
    group: "Reduce",
    items: [
      { name: "No fast food", area: "habits", kind: "reduce", schedule: { type: "daily" }, priority: "medium", difficulty: 3, severity: 3, color: c(4) },
      { name: "Excessive social media", area: "habits", kind: "reduce", schedule: { type: "daily" }, priority: "medium", difficulty: 3, severity: 3, color: c(4) },
      { name: "Late-night screens", area: "habits", kind: "reduce", schedule: { type: "daily" }, priority: "low", difficulty: 2, severity: 2, color: c(4) },
      { name: "Snacking / sweets", area: "habits", kind: "reduce", schedule: { type: "daily" }, priority: "low", difficulty: 2, severity: 2, color: c(4) },
      { name: "Alcohol", area: "habits", kind: "reduce", schedule: { type: "daily" }, priority: "medium", difficulty: 3, severity: 3, color: c(4) },
      { name: "Smoking / vaping", area: "habits", kind: "reduce", schedule: { type: "daily" }, priority: "high", difficulty: 4, severity: 4, color: c(4) },
      { name: "Caffeine after 2pm", area: "habits", kind: "reduce", schedule: { type: "daily" }, priority: "low", difficulty: 2, severity: 2, color: c(4) },
      { name: "Doomscrolling", area: "habits", kind: "reduce", schedule: { type: "daily" }, priority: "medium", difficulty: 3, severity: 2, color: c(4) },
      { name: "Procrastination", area: "habits", kind: "reduce", schedule: { type: "daily" }, priority: "medium", difficulty: 4, severity: 3, color: c(4) },
    ],
  },
];

export interface GoalTemplate {
  title: string;
  area: "sport" | "learning" | "creativity" | "finances" | "career" | "travel" | "personal";
  milestones: string[];
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  { title: "Bench press bodyweight", area: "sport", milestones: ["Warm-up routine dialed in", "Hit 80% of bodyweight", "Hit 90%", "Full bodyweight rep"] },
  { title: "Run a 5K", area: "sport", milestones: ["Run 1K non-stop", "Run 3K", "Run 5K slow", "5K under target time"] },
  { title: "Read 12 books this year", area: "learning", milestones: ["3 books", "6 books", "9 books", "12 books"] },
  { title: "Save an emergency fund", area: "finances", milestones: ["1 month of expenses", "2 months", "3 months"] },
  { title: "Finish a creative project", area: "creativity", milestones: ["Outline / concept", "First draft", "Revise", "Publish / release"] },
];
