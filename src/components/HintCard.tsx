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
    <div className="relative flex gap-3 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/50 p-4">
      <span className="grad flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white">
        <Lightbulb size={16} />
      </span>
      <div className="min-w-0 flex-1 pr-5">
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-0.5 text-[13px] leading-[1.5] text-[var(--text-muted)]">{children}</p>
        <button onClick={dismiss} className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline">
          {t("Got it")}
        </button>
      </div>
      <button onClick={dismiss} className="absolute right-2.5 top-2.5 text-[var(--text-faint)] hover:text-[var(--text)]" aria-label={t("Dismiss")}>
        <X size={16} />
      </button>
    </div>
  );
}
