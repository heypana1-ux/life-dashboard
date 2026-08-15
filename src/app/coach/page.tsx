"use client";

import { Sparkles } from "lucide-react";
import { CoachChat } from "@/components/Coach";
import { useT } from "@/lib/i18n";

export default function CoachPage() {
  const t = useT();
  return (
    <div className="flex min-h-[calc(100dvh-104px)] flex-col">
      <div className="card relative flex min-h-0 flex-1 flex-col overflow-hidden border-[var(--accent)]/30 !p-0">
        {/* Slim, theme-aware gradient header */}
        <div className="grad flex items-center gap-2.5 px-4 py-3 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Sparkles size={18} />
          </span>
          <div className="leading-tight">
            <div className="text-[15px] font-bold">{t("Coach")}</div>
            <div className="text-[11px] text-white/85">{t("Your data, interpreted. Ask anything.")}</div>
          </div>
        </div>

        {/* Themed chat surface — question & answer live here */}
        <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-[var(--accent-soft)]/45 via-[var(--surface)] to-[var(--surface)] px-3.5 pb-3.5 pt-2.5">
          <CoachChat hideHeader />
        </div>
      </div>
    </div>
  );
}
