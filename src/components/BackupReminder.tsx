"use client";

import { useState } from "react";
import { Download, ShieldAlert, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { downloadBackup, hasMeaningfulData } from "@/lib/backup";

const THRESHOLD_DAYS = 14;

function daysSince(iso?: string): number {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/**
 * A dismissable banner that nudges the user to export a backup when they haven't in a while.
 * Data lives only in localStorage, so this is the safety net against accidental loss.
 */
export function BackupReminder() {
  const { data, updateSettings } = useStore();
  const t = useT();
  const [dismissed, setDismissed] = useState(false);

  const overdue = daysSince(data.settings.lastBackupAt) >= THRESHOLD_DAYS;
  if (dismissed || !overdue || !hasMeaningfulData(data)) return null;

  function backup() {
    const at = downloadBackup(data);
    updateSettings({ lastBackupAt: at });
    setDismissed(true);
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-[var(--warn)]/40 bg-[var(--good-soft)] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-[var(--warn)]" />
        <p className="text-sm">
          {t("Your data lives only in this browser. Export a backup so you don't lose it.")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={backup}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Download size={15} /> {t("Back up now")}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-2)]"
          aria-label={t("Dismiss")}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
