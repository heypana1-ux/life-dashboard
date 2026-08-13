import { supabase, isSyncConfigured } from "./supabase";
import { AreaKey, DayScore } from "./types";

/*
  Scoreboard client. Requires the Supabase setup (auth + the tables in
  supabase/scoreboard.sql). Everything is gated on being signed in — RLS on the
  server guarantees you only ever read scores of people you share a league with,
  or who opted into the global ranking.
*/

export const isLeaderboardConfigured = isSyncConfigured;

export interface LeaderRow {
  user_id: string;
  display_name: string;
  overall: number;
  categories: Partial<Record<AreaKey, number>>;
  global: boolean;
  updated_at: string;
}

export interface League {
  id: string;
  code: string;
  name: string;
}

/** Average overall + per-category scores over the last N logged days (stable ranking value). */
export function averageScores(
  history: DayScore[],
  days = 7,
): { overall: number; categories: Partial<Record<AreaKey, number>> } {
  const last = history.filter((h) => h.lifeScore > 0).slice(-days);
  if (last.length === 0) return { overall: 0, categories: {} };
  const overall = Math.round(last.reduce((a, b) => a + b.lifeScore, 0) / last.length);
  const sums = new Map<AreaKey, { s: number; n: number }>();
  for (const d of last) {
    for (const [k, v] of Object.entries(d.categories)) {
      if (v == null) continue;
      const cur = sums.get(k as AreaKey) ?? { s: 0, n: 0 };
      cur.s += v;
      cur.n += 1;
      sums.set(k as AreaKey, cur);
    }
  }
  const categories: Partial<Record<AreaKey, number>> = {};
  for (const [k, { s, n }] of sums) categories[k] = Math.round(s / n);
  return { overall, categories };
}

async function userId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getMyRow(): Promise<LeaderRow | null> {
  if (!supabase) return null;
  const uid = await userId();
  if (!uid) return null;
  const { data, error } = await supabase.from("leaderboard").select("*").eq("user_id", uid).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as LeaderRow) ?? null;
}

export async function publishScores(
  displayName: string,
  overall: number,
  categories: Partial<Record<AreaKey, number>>,
  global: boolean,
): Promise<void> {
  if (!supabase) throw new Error("not configured");
  const uid = await userId();
  if (!uid) throw new Error("not signed in");
  const { error } = await supabase.from("leaderboard").upsert({
    user_id: uid,
    display_name: displayName.trim().slice(0, 40) || "Anonymous",
    overall,
    categories,
    global,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function getGlobalBoard(limit = 100): Promise<LeaderRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("global", true)
    .order("overall", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as LeaderRow[]) ?? [];
}

export async function getMyLeagues(): Promise<League[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("my_leagues");
  if (error) throw new Error(error.message);
  return (data as League[]) ?? [];
}

export async function createLeague(name: string): Promise<League> {
  if (!supabase) throw new Error("not configured");
  const { data, error } = await supabase.rpc("create_league", { p_name: name });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? (data[0] as League) : (data as League);
}

export async function joinLeague(code: string): Promise<League> {
  if (!supabase) throw new Error("not configured");
  const { data, error } = await supabase.rpc("join_league", { p_code: code });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? (data[0] as League) : (data as League);
}

export async function getLeagueBoard(leagueId: string): Promise<LeaderRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("league_board", { p_league: leagueId });
  if (error) throw new Error(error.message);
  const rows = (data as LeaderRow[]) ?? [];
  return rows.sort((a, b) => b.overall - a.overall);
}

export async function leaveLeague(leagueId: string): Promise<void> {
  if (!supabase) throw new Error("not configured");
  const uid = await userId();
  if (!uid) throw new Error("not signed in");
  const { error } = await supabase.from("league_members").delete().eq("league_id", leagueId).eq("user_id", uid);
  if (error) throw new Error(error.message);
}
