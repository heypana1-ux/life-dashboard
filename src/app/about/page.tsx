"use client";

import { useState } from "react";
import { Sparkles, UserCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { ABOUT_GROUPS, ABOUT_QUESTIONS, aboutAnsweredCount, AboutQuestion } from "@/lib/about";
import { Card, PageHeader, SectionTitle, Badge } from "@/components/ui";

export default function AboutPage() {
  const { data } = useStore();
  const t = useT();
  const about = data.settings.about ?? {};
  const answered = aboutAnsweredCount(about);
  const total = ABOUT_QUESTIONS.length;

  return (
    <div className="space-y-[14px]">
      <PageHeader
        kicker={t("{a} of {b} answered", { a: answered, b: total })}
        lead={t("About")}
        title={t("you")}
        subtitle={t("Answer at your own pace — the more the coach knows, the better its advice.")}
        action={<Badge tone="accent">{answered}/{total}</Badge>}
      />

      {/* Privacy note as the Pulse insight card. */}
      <div className="area-soft flex items-start gap-3 rounded-[24px] border border-[color-mix(in_srgb,var(--area-a)_22%,transparent)] p-[18px]">
        <Sparkles size={17} className="mt-px shrink-0" />
        <p className="min-w-0 text-[12px] leading-[1.5] text-[var(--text-muted)]">
          {t("These answers stay on your device (and sync if you enabled it). They're only shared with the AI coach when it's turned on, so it can tailor its advice to you.")}
        </p>
      </div>

      {ABOUT_GROUPS.map((g) => (
        <Card key={g.group}>
          <SectionTitle right={<UserCircle size={16} className="text-[var(--text-faint)]" />}>{t(g.group)}</SectionTitle>
          <div className="flex flex-col gap-[15px]">
            {g.questions.map((q) => (
              <AboutField key={q.id} q={q} value={about[q.id] ?? ""} />
            ))}
          </div>
        </Card>
      ))}

      <p className="pb-4 text-center text-[10.5px] text-[var(--text-dim)]">{t("You can edit any of this any time.")}</p>
    </div>
  );
}

function AboutField({ q, value }: { q: AboutQuestion; value: string }) {
  const { data, updateSettings } = useStore();
  const t = useT();
  const [draft, setDraft] = useState(value);

  function persist(v: string) {
    updateSettings({ about: { ...(data.settings.about ?? {}), [q.id]: v } });
  }

  return (
    <div>
      <div className="mb-[7px] text-[12.5px] font-medium">{t(q.q)}</div>
      {q.options && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {q.options.map((opt) => {
            const active = draft.trim() === t(opt);
            return (
              <button
                key={opt}
                onClick={() => { const v = active ? "" : t(opt); setDraft(v); persist(v); }}
                className={`rounded-full border px-3 py-1.5 text-[11.5px] transition ${
                  active
                    ? "grad-soft border-[var(--area-a)] font-semibold text-[var(--text-muted)]"
                    : "border-[var(--border)] bg-[var(--surface-2)] font-medium text-[var(--text-muted)]"
                }`}
              >
                {t(opt)}
              </button>
            );
          })}
        </div>
      )}
      <textarea
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => persist(draft)}
        placeholder={q.placeholder ? t(q.placeholder) : t("Your answer…")}
        className="min-h-[44px] w-full resize-none rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-[11px] text-[12.5px] leading-[1.5] outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--area-a)]"
      />
    </div>
  );
}
