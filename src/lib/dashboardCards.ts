/*
  Single source of truth for the dashboard's reorderable/hideable cards, their default layout,
  and the "legacy layout" migration. Shared by the dashboard page and the AI quick-capture tool
  so both agree on card ids and defaults.
*/

export const DASHBOARD_CARDS = [
  "categories", "activity", "anomalies", "insights",
  "weekPlan", "weeklyFocus", "level", "goals", "coachBriefing", "coachCheckin",
] as const;
export type DashboardCardId = (typeof DASHBOARD_CARDS)[number];

/** Default order: the essentials first, everything else after. */
export const DEFAULT_ORDER: DashboardCardId[] = [
  "categories", "activity", "anomalies", "insights",
  "weekPlan", "weeklyFocus", "level", "goals", "coachBriefing", "coachCheckin",
];

/** Hidden by default — the dashboard starts focused; these are opt-in extras. */
export const DEFAULT_HIDDEN: DashboardCardId[] = [
  "weekPlan", "weeklyFocus", "level", "goals", "coachBriefing", "coachCheckin",
];

export const CARD_LABELS: Record<DashboardCardId, string> = {
  categories: "Categories",
  activity: "Activity",
  anomalies: "Heads up",
  insights: "Insights",
  weekPlan: "This week's plan",
  weeklyFocus: "This week's focus",
  level: "Level",
  goals: "Today's goals",
  coachBriefing: "Coach briefing",
  coachCheckin: "Weekly check-in",
};

export function isDashboardCard(id: string): id is DashboardCardId {
  return (DASHBOARD_CARDS as readonly string[]).includes(id);
}

interface DashboardPref {
  order?: string[];
  hidden?: string[];
}

/** A layout saved before the categories/insights split (or never customized) counts as "legacy":
 *  we re-seed the fresh, decluttered defaults for it. Once the user customizes again their saved
 *  order contains "categories" and their own preferences take over. */
export function isLegacyLayout(dashboard?: DashboardPref): boolean {
  const order = dashboard?.order;
  return !order || !order.includes("categories");
}

/** Resolve the stored (possibly partial/legacy) preference into a concrete order + hidden set. */
export function effectiveLayout(dashboard?: DashboardPref): {
  order: DashboardCardId[];
  hidden: DashboardCardId[];
} {
  if (isLegacyLayout(dashboard)) return { order: [...DEFAULT_ORDER], hidden: [...DEFAULT_HIDDEN] };
  const saved = (dashboard?.order ?? []).filter(isDashboardCard);
  const order = saved.length
    ? [...saved, ...DASHBOARD_CARDS.filter((id) => !saved.includes(id))]
    : [...DEFAULT_ORDER];
  const hidden = (dashboard?.hidden ?? []).filter(isDashboardCard);
  return { order, hidden };
}
