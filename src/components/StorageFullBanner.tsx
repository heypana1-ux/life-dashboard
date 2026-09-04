"use client";

import { Download, HardDrive } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

/*
  Shown the moment a save is rejected because the browser's storage is full.

  This has to be loud. Until now the failure was silent, so the app looked fine while nothing
  was being written — and the whole session vanished on the next reload. A visible warning with
  a one-tap export turns silent data loss into a recoverable annoyance.
*/

export function StorageFullBanner() {
  const { data, storageFull } = useStore();
  const t = useT();
  if (!storageFull) return null;

  function exportData() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-[18px] flex gap-3 rounded-[18px] border border-[color-mix(in_srgb,var(--bad)_40%,transparent)] bg-[var(--bad-soft)] px-4 py-3.5">
      <HardDrive size={18} className="mt-px shrink-0 text-[var(--bad)]" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-[var(--bad)]">{t("Storage is full")}</div>
        <p className="mt-1 text-[12px] leading-[1.5] text-[var(--text-muted)]">
          {t("New entries can't be saved right now. Export a backup, then remove a few photos to free up space.")}
        </p>
        <button
          onClick={exportData}
          className="mt-2 inline-flex items-center gap-1.5 rounded-[11px] bg-[var(--bad)] px-3 py-1.5 text-[12px] font-semibold text-white"
        >
          <Download size={14} /> {t("Export now")}
        </button>
      </div>
    </div>
  );
}
