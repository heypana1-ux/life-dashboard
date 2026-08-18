import { AppData, DayScore } from "./types";
import { computeAchievements } from "./achievements";

/*
  A derived Level / XP layer on top of the ELO rating — pure motivation, never stored.
  XP accrues from the things the app already tracks; the level curve grows super-linearly so
  early levels come quickly and later ones feel earned.
*/

export interface LevelInfo {
  level: number;
  title: string; // English key
  xp: number; // total lifetime XP
  intoLevel: number; // XP earned within the current level
  span: number; // XP from this level to the next
  pct: number; // 0..100 progress to next level
}

/** Cumulative XP required to reach a given level (level 1 = 0). */
function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(120 * Math.pow(level - 1, 1.55));
}

function titleForLevel(level: number): string {
  if (level >= 35) return "Master";
  if (level >= 20) return "Veteran";
  if (level >= 10) return "Committed";
  if (level >= 5) return "Builder";
  return "Beginner";
}

/** XP granted for claiming one completed weekly challenge. */
export const CHALLENGE_XP = 40;

export function totalXP(data: AppData, history: DayScore[]): number {
  const loggedDays = history.filter((h) => h.lifeScore > 0);
  const scoreXP = loggedDays.reduce((s, h) => s + h.lifeScore, 0); // up to 100/day
  const workoutXP = data.workouts.length * 20;
  const journalXP = data.journal.length * 10;
  const goalsDone = data.goals.filter((g) => g.progress >= 100).length * 150;
  const achievementsXP = computeAchievements(data, history).filter((a) => a.unlocked).length * 75;
  const challengeXP = (data.rewards.challengeClaims?.length ?? 0) * CHALLENGE_XP;
  return scoreXP + workoutXP + journalXP + goalsDone + achievementsXP + challengeXP;
}

export function computeLevel(data: AppData, history: DayScore[]): LevelInfo {
  const xp = totalXP(data, history);
  let level = 1;
  while (level < 99 && xpForLevel(level + 1) <= xp) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = Math.max(1, next - base);
  const intoLevel = xp - base;
  return {
    level,
    title: titleForLevel(level),
    xp,
    intoLevel,
    span,
    pct: Math.min(100, Math.round((intoLevel / span) * 100)),
  };
}
