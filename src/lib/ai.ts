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

export async function askCoach(
  messages: CoachTurn[],
  context: string,
  language: string,
): Promise<CoachResult> {
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context, language }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (json.error as CoachErrorCode) || "network" };
    return { reply: json.reply as string };
  } catch {
    return { error: "network" };
  }
}
