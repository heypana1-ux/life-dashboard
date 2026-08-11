"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { computeAchievements, computeRecords } from "@/lib/achievements";
import { Card, PageHeader, SectionTitle, Badge } from "@/components/ui";
import clsx from "clsx";

export default function AchievementsPage() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();

  const achievements = useMemo(() => computeAchievements(data, d.history), [data, d.history]);
  const records = useMemo(() => computeRecords(data, d.history), [data, d.history]);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Achievements")}
        subtitle={t("Milestones and personal records from your data.")}
      />

      <Card>
        <SectionTitle right={<Badge tone="accent">{unlocked}/{achievements.length} {t("Unlocked")}</Badge>}>
          {t("Achievements")}
        </SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => {
            const pct = Math.min(100, Math.round((a.current / a.target) * 100));
            return (
              <div
                key={a.id}
                className={clsx(
                  "flex items-start gap-3 rounded-xl border p-3 transition",
                  a.unlocked
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--surface-2)]",
                )}
              >
                <div className={clsx("text-2xl", !a.unlocked && "opacity-40 grayscale")}>{a.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{t(a.title)}</span>
                    {a.unlocked && <Badge tone="good">✓</Badge>}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{t(a.description)}</p>
                  {!a.unlocked && (
                    <div className="mt-2">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] tabular-nums text-[var(--text-faint)]">
                        {a.current} / {a.target}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-[var(--text-faint)]">{t("Keep logging to unlock more.")}</p>
      </Card>

      <Card>
        <SectionTitle>{t("Personal records")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {records.map((r) => (
            <div key={r.id} className="rounded-xl bg-[var(--surface-2)] p-4">
              <div className="mb-1 text-2xl">{r.icon}</div>
              <div className="text-lg font-bold tabular-nums">{r.value}</div>
              <div className="text-xs text-[var(--text-muted)]">{t(r.label)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
