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

/* ---------------- Agent (tool-calling) coach ---------------- */

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
export interface AgentMsg {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}
export interface AgentResult {
  reply?: string;
  toolCalls?: ToolCall[] | null;
  error?: CoachErrorCode;
}

/** One round of the agent loop: may return a final reply and/or tool calls to execute. */
export async function askCoachAgent(messages: AgentMsg[], context: string, language: string): Promise<AgentResult> {
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context, language, mode: "agent" }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (json.error as CoachErrorCode) || "network" };
    return { reply: (json.reply as string) ?? "", toolCalls: (json.toolCalls as ToolCall[]) ?? null };
  } catch {
    return { error: "network" };
  }
}

/* ---------------- Quick-capture (single JSON request, no tools) ---------------- */

export interface CaptureAction {
  do: string;
  [key: string]: unknown;
}
export interface CaptureResult {
  actions?: CaptureAction[];
  reply?: string;
  error?: CoachErrorCode;
}

/** Parse the model's capture JSON into a clean action list; tolerant of code fences / stray text. */
export function parseCapture(reply: string): { actions: CaptureAction[]; reply: string } {
  let raw = reply.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  try {
    const obj = JSON.parse(raw) as { actions?: unknown; reply?: unknown };
    const actions = Array.isArray(obj.actions)
      ? (obj.actions as unknown[])
          .filter((a): a is CaptureAction => !!a && typeof (a as { do?: unknown }).do === "string")
          .slice(0, 12)
      : [];
    return { actions, reply: typeof obj.reply === "string" ? obj.reply : "" };
  } catch {
    return { actions: [], reply: "" };
  }
}

/** Single request that returns a list of app actions to run locally (no tool schemas, no loop). */
export async function captureActions(text: string, context: string, language: string): Promise<CaptureResult> {
  const res = await askCoach([{ role: "user", content: text }], context, language, "capture");
  if (res.error) return { error: res.error };
  const parsed = parseCapture(res.reply ?? "");
  return { actions: parsed.actions, reply: parsed.reply };
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

/* ---------------- AI natural-language quick logging ---------------- */

export type ReviewKey = "mood" | "energy" | "productivity" | "satisfaction" | "discipline";

export interface ParsedLog {
  review?: Partial<Record<ReviewKey, number>>;
  sleepHours?: number;
  sleepQuality?: number;
  habits?: { name: string; done: boolean }[];
  workout?: { sport: string; minutes?: number };
  water?: number;
  weightKg?: number;
  journal?: string;
  note?: string;
}

/** Send free text + the user's habit names; the server returns structured JSON to apply. */
export async function logFromText(text: string, habitNames: string, language: string): Promise<CoachResult> {
  return askCoach([{ role: "user", content: text }], habitNames, language, "log");
}

const REVIEW_KEYS: ReviewKey[] = ["mood", "energy", "productivity", "satisfaction", "discipline"];
const clampInt = (n: unknown, lo: number, hi: number): number | undefined => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined;
};

/** Leniently parse the model's quick-log JSON into a clean ParsedLog; null if unusable. */
export function parseQuickLog(reply: string): ParsedLog | null {
  let raw = reply.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const out: ParsedLog = {};

  if (obj.review && typeof obj.review === "object") {
    const r: Partial<Record<ReviewKey, number>> = {};
    for (const k of REVIEW_KEYS) {
      const v = clampInt((obj.review as Record<string, unknown>)[k], 1, 10);
      if (v != null) r[k] = v;
    }
    if (Object.keys(r).length) out.review = r;
  }
  const sh = Number(obj.sleepHours);
  if (Number.isFinite(sh) && sh > 0 && sh <= 24) out.sleepHours = Math.round(sh * 10) / 10;
  const sq = clampInt(obj.sleepQuality, 1, 10);
  if (sq != null) out.sleepQuality = sq;
  if (Array.isArray(obj.habits)) {
    const hs = (obj.habits as unknown[])
      .filter((h): h is { name: string; done?: boolean } => !!h && typeof (h as { name?: unknown }).name === "string" && ((h as { name: string }).name).trim().length > 0)
      .map((h) => ({ name: h.name.trim(), done: h.done !== false }));
    if (hs.length) out.habits = hs.slice(0, 12);
  }
  if (obj.workout && typeof obj.workout === "object") {
    const w = obj.workout as { sport?: unknown; minutes?: unknown };
    if (typeof w.sport === "string" && w.sport.trim()) {
      const minutes = Number(w.minutes);
      out.workout = { sport: w.sport.trim().slice(0, 40), minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : undefined };
    }
  }
  const water = Number(obj.water);
  if (Number.isFinite(water) && water > 0 && water <= 30) out.water = Math.round(water);
  const kg = Number(obj.weightKg);
  if (Number.isFinite(kg) && kg > 20 && kg < 400) out.weightKg = Math.round(kg * 10) / 10;
  if (typeof obj.journal === "string" && obj.journal.trim().length > 1) out.journal = obj.journal.trim().slice(0, 2000);
  if (typeof obj.note === "string" && obj.note.trim()) out.note = obj.note.trim().slice(0, 300);

  const has = out.review || out.sleepHours || out.habits || out.workout || out.water != null || out.weightKg != null || out.journal;
  return has ? out : null;
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
