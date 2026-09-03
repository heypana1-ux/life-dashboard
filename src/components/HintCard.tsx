"use client";

import { Lightbulb, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

/*
  A one-time, dismissible "spotlight" that introduces a new feature. Once dismissed it stays
  hidden (persisted in settings.hintsSeen), so it also works for users who onboarded before the
  feature existed. Keep the `id` stable per feature.
*/
export function HintCard({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { data, updateSettings } = useStore();
  const t = useT();
  const seen = data.settings.hintsSeen ?? [];
  if (seen.includes(id)) return null;

  function dismiss() {
    updateSettings({ hintsSeen: [...new Set([...(data.settings.hintsSeen ?? []), id])] });
  }

  return (
    /* Pulse insight card: area-tinted wash, hairline area border, bare lightbulb. */
    <div className="area-deep relative flex gap-3 rounded-[18px] border border-[color-mix(in_srgb,var(--area-a)_22%,transparent)] px-4 py-3.5">
      <Lightbulb size={16} className="area-text mt-px shrink-0" />
      <div className="min-w-0 flex-1 pr-4">
        <div className="text-[12.5px] font-bold">{title}</div>
        <p className="mt-1 text-[12px] leading-[1.5] text-[var(--text-muted)]">{children}</p>
      </div>
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 text-[var(--text-faint)] hover:text-[var(--text)]"
        aria-label={t("Dismiss")}
      >
        <X size={14} />
      </button>
    </div>
  );
}
