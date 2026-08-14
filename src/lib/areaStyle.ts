import {
  Brain,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  type LucideIcon,
  Moon,
  Palette,
  Repeat,
  Wallet,
  Zap,
} from "lucide-react";
import { AreaKey } from "./types";

/*
  One source of truth for how each life area looks — a fixed colour and icon used everywhere
  (dashboard, habits, statistics, calendar…) so the eye learns to recognise an area at a glance.
*/

export const AREA_COLORS: Record<AreaKey, string> = {
  productivity: "#4f46e5",
  sport: "#16a34a",
  sleep: "#0ea5e9",
  habits: "#d97706",
  learning: "#9333ea",
  creativity: "#db2777",
  reflection: "#0891b2",
  finances: "#059669",
  health: "#e11d48",
};

export function areaColor(key: AreaKey): string {
  return AREA_COLORS[key] ?? "var(--accent)";
}

export const AREA_ICONS: Record<AreaKey, LucideIcon> = {
  productivity: Zap,
  sport: Dumbbell,
  sleep: Moon,
  habits: Repeat,
  learning: GraduationCap,
  creativity: Palette,
  reflection: Brain,
  finances: Wallet,
  health: HeartPulse,
};
