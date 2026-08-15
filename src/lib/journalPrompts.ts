import { parseISO } from "./date";

/*
  A rotating set of reflective journaling prompts. A stable prompt is chosen per day so the
  "prompt of the day" is consistent, but the user can shuffle to another one. English keys.
*/
export const JOURNAL_PROMPTS: string[] = [
  "What went well today, and why?",
  "What drained you today, and what could soften it tomorrow?",
  "What are you grateful for right now?",
  "What's one small win you can build on?",
  "What did you learn about yourself today?",
  "What's taking up most of your headspace?",
  "If today had a title, what would it be?",
  "What would make tomorrow a good day?",
  "Who or what lifted your mood today?",
  "What's one thing you'd do differently?",
  "What are you avoiding, and why?",
  "When did you feel most like yourself today?",
  "What's a worry you can let go of?",
  "What progress, however small, did you make toward a goal?",
  "What does your body need more of this week?",
];

/** Deterministic prompt for a given date (YYYY-MM-DD). */
export function promptForDate(date: string): string {
  const d = parseISO(date);
  const dayNo = Math.floor(d.getTime() / 86400000);
  return JOURNAL_PROMPTS[((dayNo % JOURNAL_PROMPTS.length) + JOURNAL_PROMPTS.length) % JOURNAL_PROMPTS.length];
}
