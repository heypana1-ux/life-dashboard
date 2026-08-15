"use client";

import { Sparkles } from "lucide-react";
import { CoachChat } from "@/components/Coach";
import { useT } from "@/lib/i18n";

export default function CoachPage() {
  const t = useT();
  return (
    <div className="flex min-h-[calc(100dvh-140px)] flex-col gap-4">
      {/* Gradient hero — follows the active accent theme */}
      <div className="grad relative overflow-hidden rounded-2xl px-5 py-6 text-white shadow-[var(--shadow)]">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 right-24 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex items-center gap-3.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Sparkles size={24} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.01em]">{t("Coach")}</h1>
            <p className="mt-0.5 text-sm text-white/85">{t("Your data, interpreted. Ask anything.")}</p>
          </div>
        </div>
      </div>

      <div className="card flex min-h-0 flex-1 flex-col border-[var(--accent)]/25 bg-gradient-to-b from-[var(--accent-soft)]/40 to-transparent">
        <CoachChat hideHeader />
      </div>
    </div>
  );
}
