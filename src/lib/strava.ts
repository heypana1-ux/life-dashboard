import { AppData, Workout } from "./types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";

/*
  Strava integration (free for personal use).

  OAuth needs a client secret, which must never live in the browser, so the token
  exchange / refresh / activity fetch all go through a Supabase Edge Function
  (supabase/functions/strava). This module only holds the public client id and talks
  to that function. Tokens are kept in localStorage on this device.
*/

const CLIENT_ID = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;

export const isStravaConfigured = Boolean(CLIENT_ID && SUPABASE_URL && SUPABASE_ANON_KEY);

const FN_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/strava` : "";
const STORE_KEY = "life-dashboard:strava";

export interface StravaState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch seconds
  athlete?: { id: number; firstname?: string; lastname?: string };
  lastSync?: number; // epoch seconds of the latest imported activity
}

export function loadStrava(): StravaState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as StravaState) : null;
  } catch {
    return null;
  }
}
export function saveStrava(s: StravaState | null) {
  try {
    if (s) localStorage.setItem(STORE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORE_KEY);
  } catch {}
}

/** The redirect target Strava sends the user back to (must match the registered domain). */
export function redirectUri(): string {
  return `${window.location.origin}/settings`;
}

export function authorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: String(CLIENT_ID),
    redirect_uri: redirectUri(),
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

async function callFn<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: String(SUPABASE_ANON_KEY),
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Strava function error (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
}

/** Exchange the OAuth code (returned to /settings?code=...) for tokens. */
export async function exchangeCode(code: string): Promise<StravaState> {
  const t = await callFn<TokenResponse>({ action: "exchange", code });
  const state: StravaState = {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: t.expires_at,
    athlete: t.athlete,
  };
  saveStrava(state);
  return state;
}

async function ensureFresh(state: StravaState): Promise<StravaState> {
  if (state.expiresAt - 60 > Date.now() / 1000) return state;
  const t = await callFn<TokenResponse>({ action: "refresh", refresh_token: state.refreshToken });
  const next: StravaState = {
    ...state,
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: t.expires_at,
  };
  saveStrava(next);
  return next;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  start_date_local: string;
  moving_time: number; // seconds
  elapsed_time: number;
  distance: number; // meters
  average_heartrate?: number;
}

const SPORT_MAP: Record<string, string> = {
  Run: "Running",
  TrailRun: "Running",
  Ride: "Cycling",
  VirtualRide: "Cycling",
  MountainBikeRide: "Cycling",
  Walk: "Walking",
  Hike: "Hiking",
  Swim: "Swimming",
  WeightTraining: "Strength Training",
  Workout: "Workout",
  Yoga: "Yoga",
  Rowing: "Rowing",
  Elliptical: "Elliptical",
};
function sportName(a: StravaActivity): string {
  const key = a.sport_type || a.type || "Workout";
  return SPORT_MAP[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function toWorkout(a: StravaActivity): Workout {
  const distanceKm = a.distance > 0 ? Math.round((a.distance / 1000) * 100) / 100 : undefined;
  return {
    id: `wk_strava_${a.id}`,
    date: a.start_date_local.slice(0, 10),
    sport: sportName(a),
    durationMin: Math.max(1, Math.round(a.moving_time / 60)),
    exercises: [],
    ...(distanceKm ? { distanceKm } : {}),
    ...(a.average_heartrate ? { avgPulse: Math.round(a.average_heartrate) } : {}),
    notes: a.name,
  };
}

export interface StravaSyncResult {
  state: StravaState;
  next: AppData;
  imported: number;
  skipped: number;
}

/** Fetch recent activities and merge them into the dashboard as workouts (dedup by Strava id). */
export async function syncStrava(stateIn: StravaState, data: AppData): Promise<StravaSyncResult> {
  const state = await ensureFresh(stateIn);
  // Fetch since the last import (minus a small overlap), or the last ~6 months on first sync.
  const after = state.lastSync ? state.lastSync - 3600 : Math.floor(Date.now() / 1000) - 180 * 86400;
  const activities = await callFn<StravaActivity[]>({
    action: "activities",
    access_token: state.accessToken,
    after,
    per_page: 100,
  });

  const existing = new Set(data.workouts.map((w) => w.id));
  const added: Workout[] = [];
  let skipped = 0;
  let maxTs = state.lastSync ?? 0;
  for (const a of activities) {
    const ts = Math.floor(new Date(a.start_date_local).getTime() / 1000);
    if (ts > maxTs) maxTs = ts;
    const w = toWorkout(a);
    if (existing.has(w.id)) {
      skipped++;
      continue;
    }
    existing.add(w.id);
    added.push(w);
  }

  const next: AppData = {
    ...data,
    workouts: [...data.workouts, ...added].sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
  const nextState: StravaState = { ...state, lastSync: maxTs || Math.floor(Date.now() / 1000) };
  saveStrava(nextState);
  return { state: nextState, next, imported: added.length, skipped };
}
