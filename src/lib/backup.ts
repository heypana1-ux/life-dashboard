import { AppData } from "./types";

/** Trigger a JSON download of the full app data. Returns the ISO timestamp used. */
export function downloadBackup(data: AppData): string {
  const now = new Date().toISOString();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `life-dashboard-${now.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return now;
}

/** Whether the dataset holds anything worth backing up. */
export function hasMeaningfulData(data: AppData): boolean {
  return (
    data.habitLogs.length > 0 ||
    data.reviews.length > 0 ||
    data.sleep.length > 0 ||
    data.journal.length > 0 ||
    data.workouts.length > 0 ||
    data.goals.length > 0 ||
    data.finances.accounts.length > 0 ||
    data.finances.holdings.length > 0
  );
}
