"use client";

import { useState } from "react";
import { Moon, Sparkles, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { AREA_LABELS, DEFAULT_AREAS, starterHabits } from "@/lib/defaults";
import { generateDemo } from "@/lib/demo";
import { AreaKey } from "@/lib/types";
import { Button, Card, Field } from "@/components/ui";
import clsx from "clsx";

const SELECTABLE: AreaKey[] = [
  "sport",
  "sleep",
  "learning",
  "creativity",
  "reflection",
  "habits",
  "productivity",
  "finances",
];

const AREA_DESC: Record<AreaKey, string> = {
  productivity: "Focus & deep work",
  sport: "Training & movement",
  sleep: "Rest & recovery",
  habits: "Build & reduce behaviors",
  learning: "Study & skills",
  creativity: "Projects & making",
  reflection: "Daily check-ins & mood",
  finances: "Net worth & spending (roadmap)",
};

export function Onboarding() {
  const { data, replaceAll } = useStore();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<AreaKey>>(
    new Set(["sport", "sleep", "habits", "reflection", "productivity"]),
  );
  const [sleepH, setSleepH] = useState(8);
  const [trainPerWeek, setTrainPerWeek] = useState(3);

  const toggle = (k: AreaKey) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  function finish(withDemo: boolean) {
    const areas = DEFAULT_AREAS.map((a) => {
      const enabled = a.key === "finances" ? selected.has("finances") : selected.has(a.key);
      return { ...a, enabled };
    });
    // redistribute weight of disabled areas is handled at scoring time; keep base weights.
    let next = {
      ...data,
      settings: {
        ...data.settings,
        areas,
        sleepTargetMinutes: Math.round(sleepH * 60),
        onboardingComplete: true,
      },
    };

    if (withDemo) {
      next = generateDemo(next);
    } else {
      const habits = starterHabits(selected).map((h) => {
        if (h.name === "Strength Training") {
          return { ...h, schedule: { type: "weekly" as const, timesPerWeek: trainPerWeek } };
        }
        return h;
      });
      next = { ...next, habits };
    }
    replaceAll(next);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
          <Sparkles size={20} />
        </div>
        <span className="text-lg font-semibold">Life Dashboard</span>
      </div>

      {step === 0 && (
        <Card className="animate-in">
          <h1 className="text-2xl font-semibold tracking-tight">Which areas matter to you?</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Pick what you want to track. You can change any of this later — turning an area
            off keeps your dashboard focused.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SELECTABLE.map((k) => {
              const on = selected.has(k);
              return (
                <button
                  key={k}
                  onClick={() => toggle(k)}
                  className={clsx(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                    on
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--text-faint)]",
                  )}
                >
                  <span
                    className={clsx(
                      "mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border",
                      on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)]",
                    )}
                  >
                    {on && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{AREA_LABELS[k]}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{AREA_DESC[k]}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setStep(1)} disabled={selected.size === 0}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="animate-in">
          <h1 className="text-2xl font-semibold tracking-tight">A few targets</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            These seed your goals. Nothing here is a medical recommendation — just your own
            targets to measure against.
          </p>
          <div className="mt-5 space-y-5">
            <Field label={`Sleep target: ${sleepH}h`} hint="Used as your personal baseline for sleep scoring.">
              <input
                type="range"
                min={5}
                max={10}
                step={0.5}
                value={sleepH}
                onChange={(e) => setSleepH(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </Field>
            {selected.has("sport") && (
              <Field label={`Training: ${trainPerWeek}× / week`}>
                <input
                  type="range"
                  min={1}
                  max={7}
                  step={1}
                  value={trainPerWeek}
                  onChange={(e) => setTrainPerWeek(Number(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </Field>
            )}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={() => setStep(2)}>Continue</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="animate-in">
          <h1 className="text-2xl font-semibold tracking-tight">Start with data?</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Load 45 days of realistic demo data to explore charts, ELO and insights right
            away — or start clean with a few starter habits. Demo data can be cleared any
            time in Settings.
          </p>
          <div className="mt-5 grid gap-3">
            <button
              onClick={() => finish(true)}
              className="flex items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4 text-left"
            >
              <Moon className="text-[var(--accent)]" size={20} />
              <span>
                <span className="block font-medium">Explore with demo data</span>
                <span className="block text-xs text-[var(--text-muted)]">
                  Recommended for a first look
                </span>
              </span>
            </button>
            <button
              onClick={() => finish(false)}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left hover:border-[var(--text-faint)]"
            >
              <Check className="text-[var(--text-muted)]" size={20} />
              <span>
                <span className="block font-medium">Start clean</span>
                <span className="block text-xs text-[var(--text-muted)]">
                  A handful of starter habits, no history
                </span>
              </span>
            </button>
          </div>
          <div className="mt-6">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        </Card>
      )}

      <p className="mt-6 text-center text-xs text-[var(--text-faint)]">
        Everything is stored locally in your browser. Nothing is sent anywhere.
      </p>
    </div>
  );
}
