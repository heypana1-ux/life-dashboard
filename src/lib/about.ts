/*
  The "About you" questionnaire. A one-time (editable) set of self-reported questions that give
  the AI coach the whole-person context the tracked numbers can't capture — who you are, your
  goals, your body, your health context, your work and your headspace. Answers are stored in
  settings.about (question id -> free text) and folded into the coach's snapshot.
  Labels are English keys, translated at render time.
*/

export interface AboutQuestion {
  id: string;
  q: string; // English key
  placeholder?: string; // English key
  options?: string[]; // optional quick-pick chips (English keys), also editable as free text
}

export interface AboutGroup {
  group: string; // English key
  questions: AboutQuestion[];
}

export const ABOUT_GROUPS: AboutGroup[] = [
  {
    group: "About you",
    questions: [
      { id: "situation", q: "What's your current situation?", options: ["Pupil", "Student", "Working", "Self-employed", "Between things", "Retired"] },
      { id: "work", q: "What do you do (job, studies, field)?", placeholder: "e.g. Second-year CS student, part-time barista" },
      { id: "describe", q: "How would you describe yourself in a few words?" },
      { id: "current", q: "Anything going on right now the coach should factor in?", placeholder: "e.g. Recovering from surgery — no training for 2 weeks; big exam next Friday" },
    ],
  },
  {
    group: "Goals & motivation",
    questions: [
      { id: "improve", q: "What are you most trying to improve right now?" },
      { id: "greatweek", q: "What does a great week look like for you?" },
      { id: "holdback", q: "What tends to hold you back?" },
    ],
  },
  {
    group: "Training & body",
    questions: [
      { id: "trainbg", q: "What's your training background and current routine?" },
      { id: "fitgoals", q: "What are your fitness goals?" },
      { id: "limits", q: "Any injuries or physical limitations to keep in mind?" },
    ],
  },
  {
    group: "Health",
    questions: [
      { id: "health", q: "Any health conditions or things that affect your energy?" },
      { id: "sleephabits", q: "How is your sleep usually?" },
      { id: "diet", q: "How would you describe your eating habits?" },
    ],
  },
  {
    group: "Work & focus",
    questions: [
      { id: "commitments", q: "What are your work or study commitments like?" },
      { id: "focustime", q: "When and where do you focus best?" },
    ],
  },
  {
    group: "Mind & mood",
    questions: [
      { id: "stress", q: "How are your stress and mood lately?" },
      { id: "feelbest", q: "What helps you feel your best?" },
    ],
  },
];

export const ABOUT_QUESTIONS: AboutQuestion[] = ABOUT_GROUPS.flatMap((g) => g.questions);

/** How many questions have a non-empty answer. */
export function aboutAnsweredCount(about?: Record<string, string>): number {
  if (!about) return 0;
  return ABOUT_QUESTIONS.filter((q) => (about[q.id] ?? "").trim()).length;
}

/** Compact "self-reported profile" block for the coach snapshot (English question text). */
export function aboutSummary(about?: Record<string, string>): string {
  if (!about) return "";
  const lines: string[] = [];
  for (const q of ABOUT_QUESTIONS) {
    const a = (about[q.id] ?? "").trim();
    if (a) lines.push(`- ${q.q} ${a}`);
  }
  return lines.join("\n");
}
