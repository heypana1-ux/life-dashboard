"use client";

import { useState } from "react";
import Link from "next/link";
import { Moon, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { habitsForToday } from "@/lib/habitView";
import { todayISO, fmtLong } from "@/lib/date";
import { DailyReview } from "@/lib/types";
import { useTodayComputation } from "@/lib/useDerived";
import {
  Card,
  PageHeader,
  SectionTitle,
  Button,
  ScaleInput,
  Field,
  inputCls,
  Badge,
} from "@/components/ui";
import { HabitRow } from "@/components/HabitRow";
import { ScoreRing } from "@/components/ScoreRing";

const REVIEW_FIELDS: { key: keyof DailyReview; label: string }[] = [
  { key: "productivity", label: "Productivity" },
  { key: "mood", label: "Mood" },
  { key: "energy", label: "Energy" },
  { key: "satisfaction", label: "Satisfaction" },
  { key: "discipline", label: "Discipline" },
];

export default function TodayPage() {
  const { data, saveReview } = useStore();
  const date = todayISO();
  const comp = useTodayComputation();
  const goals = habitsForToday(data, date);
  const build = goals.filter((g) => g.habit.kind === "build");
  const reduce = goals.filter((g) => g.habit.kind === "reduce");

  const existing = data.reviews.find((r) => r.date === date);
  const [review, setReview] = useState<DailyReview>(
    existing ?? {
      date,
      productivity: 6,
      mood: 6,
      energy: 6,
      satisfaction: 6,
      discipline: 6,
    },
  );
  const [savedFlash, setSavedFlash] = useState(false);

  function save() {
    saveReview({ ...review, date });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Today" subtitle={fmtLong(date)} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Goals */}
          <Card>
            <SectionTitle
              right={
                <span className="text-xs text-[var(--text-faint)]">
                  {build.filter((g) => g.log?.done).length}/{build.length} done
                </span>
              }
            >
              Goals
            </SectionTitle>
            {build.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                No goals scheduled today.{" "}
                <Link href="/habits" className="text-[var(--accent)]">
                  Manage habits
                </Link>
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {build.map((g) => (
                  <HabitRow key={g.habit.id} item={g} date={date} />
                ))}
              </div>
            )}
          </Card>

          {/* Reduce habits */}
          {reduce.length > 0 && (
            <Card>
              <SectionTitle right={<Badge tone="bad">Reduce</Badge>}>Watch-list</SectionTitle>
              <p className="mb-1 text-xs text-[var(--text-muted)]">
                Tap only if the behavior happened today. Avoided by default.
              </p>
              <div className="divide-y divide-[var(--border)]">
                {reduce.map((g) => (
                  <HabitRow key={g.habit.id} item={g} date={date} />
                ))}
              </div>
            </Card>
          )}

          {/* Daily review */}
          <Card>
            <SectionTitle
              right={
                existing ? <Badge tone="good">Saved</Badge> : <Badge>Optional</Badge>
              }
            >
              Daily check-in
            </SectionTitle>
            <div className="space-y-4">
              {REVIEW_FIELDS.map((f) => (
                <div key={f.key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium">{f.label}</span>
                    <span className="text-sm font-semibold text-[var(--accent)]">
                      {review[f.key] as number}
                    </span>
                  </div>
                  <ScaleInput
                    value={review[f.key] as number}
                    onChange={(v) => setReview((r) => ({ ...r, [f.key]: v }))}
                  />
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Went well">
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={review.wentWell ?? ""}
                    onChange={(e) => setReview((r) => ({ ...r, wentWell: e.target.value }))}
                  />
                </Field>
                <Field label="Went badly">
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={review.wentBad ?? ""}
                    onChange={(e) => setReview((r) => ({ ...r, wentBad: e.target.value }))}
                  />
                </Field>
                <Field label="Better tomorrow">
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={review.improveTomorrow ?? ""}
                    onChange={(e) =>
                      setReview((r) => ({ ...r, improveTomorrow: e.target.value }))
                    }
                  />
                </Field>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={save}>
                  <Save size={16} /> Save check-in
                </Button>
                {savedFlash && (
                  <span className="text-sm text-[var(--good)]">Saved ✓</span>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar: live score + sleep */}
        <div className="space-y-4">
          <Card className="flex flex-col items-center">
            <SectionTitle>Projected score</SectionTitle>
            <ScoreRing value={comp.lifeScore ?? 0} size={150} />
            <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
              Updates live as you log. Categories with no data yet are excluded.
            </p>
          </Card>
          <Card>
            <SectionTitle>Sleep</SectionTitle>
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              {data.sleep.find((s) => s.date === date)
                ? "Logged for last night."
                : "Not logged for last night."}
            </p>
            <Link href="/sleep">
              <Button variant="soft" size="sm">
                <Moon size={16} /> Log sleep
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
