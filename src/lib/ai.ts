/*
  Thin client for the server-side coach endpoint. The browser never sees the API key —
  it only talks to our own /api/coach route.
*/

export interface CoachTurn {
  role: "user" | "assistant";
  content: string;
}

export type CoachErrorCode =
  | "not_configured"
  | "rate_limited"
  | "provider_error"
  | "network"
  | "empty"
  | "bad_request";

export interface CoachResult {
  reply?: string;
  error?: CoachErrorCode;
}

/** Is the coach configured on the server (key present)? Used to show setup help. */
export async function checkCoachConfigured(): Promise<boolean> {
  try {
    const res = await fetch("/api/coach", { method: "GET" });
    if (!res.ok) return false;
    const json = await res.json();
    return !!json.configured;
  } catch {
    return false;
  }
}

/** Single-shot helper for proactive features (briefing, plan-my-day). */
export async function coachAsk(prompt: string, context: string, language: string): Promise<CoachResult> {
  return askCoach([{ role: "user", content: prompt }], context, language);
}

export async function askCoach(
  messages: CoachTurn[],
  context: string,
  language: string,
  mode?: string,
): Promise<CoachResult> {
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context, language, mode }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (json.error as CoachErrorCode) || "network" };
    return { reply: json.reply as string };
  } catch {
    return { error: "network" };
  }
}

/* ---------------- AI goal breakdown ---------------- */

export interface GoalPlanHabit {
  name: string;
  area: string;
  timesPerWeek: number;
}
export interface GoalPlan {
  milestones: string[];
  habits: GoalPlanHabit[];
  note?: string;
}

const AREA_KEYS = ["sport", "productivity", "learning", "creativity", "habits"];

/** Ask the model to decompose a goal into milestones + supporting habits (JSON mode). */
export async function planGoal(goalText: string, context: string, language: string): Promise<CoachResult> {
  return askCoach([{ role: "user", content: goalText }], context, language, "goalplan");
}

/** Leniently parse the model's JSON plan; returns null if it isn't usable. */
export function parseGoalPlan(reply: string): GoalPlan | null {
  let raw = reply.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  try {
    const obj = JSON.parse(raw) as Partial<GoalPlan>;
    const milestones = Array.isArray(obj.milestones)
      ? obj.milestones.filter((m): m is string => typeof m === "string" && m.trim().length > 0).slice(0, 8)
      : [];
    const habits = Array.isArray(obj.habits)
      ? obj.habits
          .filter((h): h is GoalPlanHabit => !!h && typeof h.name === "string" && h.name.trim().length > 0)
          .map((h) => ({
            name: h.name.trim().slice(0, 60),
            area: AREA_KEYS.includes(h.area) ? h.area : "habits",
            timesPerWeek: Math.min(7, Math.max(1, Math.round(Number(h.timesPerWeek) || 3))),
          }))
          .slice(0, 5)
      : [];
    if (milestones.length === 0 && habits.length === 0) return null;
    return { milestones, habits, note: typeof obj.note === "string" ? obj.note : undefined };
  } catch {
    return null;
  }
}
