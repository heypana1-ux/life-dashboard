"use client";

import { useState } from "react";
import { BarChart3, CalendarCheck, HeartPulse, ListChecks, Sparkles, Trophy, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui";

/*
  A light first-run tour: a few dismissible slides explaining the main areas.
  Shown once after onboarding (settings.tourDone), replayable from Settings.
*/

interface Slide {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  { icon: <Sparkles size={22} />, title: "Welcome to Life Dashboard", body: "A private place to track your habits, sport, sleep, mood and more — and see how it all connects. Here's the 30-second tour." },
  { icon: <CalendarCheck size={22} />, title: "Log your day", body: "“Today” is where you tick off habits and do a quick check-in. Missed a day? You can go back and edit any date." },
  { icon: <ListChecks size={22} />, title: "Habits & goals", body: "Build good habits and reduce bad ones — daily, weekly or a number of times per day. Goals hold longer-term milestones with deadlines." },
  { icon: <HeartPulse size={22} />, title: "Areas you choose", body: "Turn areas on or off in Settings — training, sleep, learning, finances, health… Only what matters to you counts toward your Life Score." },
  { icon: <BarChart3 size={22} />, title: "Statistics & Analysis", body: "See your trends, and let the Analysis tab surface connections in your data — what lifts your score and what drags it down." },
  { icon: <Trophy size={22} />, title: "Stay motivated", body: "Streaks, achievements, animated recaps and an optional scoreboard keep it fun. Everything stays on your device unless you turn on sync." },
];

export function Tour() {
  const { data, ready, updateSettings } = useStore();
  const t = useT();
  const [i, setI] = useState(0);

  if (!ready || !data.settings.onboardingComplete || data.settings.tourDone) return null;

  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;
  const finish = () => updateSettings({ tourDone: true });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-sm rounded-2xl">
        <div className="flex justify-end">
          <button onClick={finish} className="text-[var(--text-faint)] hover:text-[var(--text)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col items-center px-2 pb-2 text-center">
          <div className="grad mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-[var(--shadow)]">
            {slide.icon}
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{t(slide.title)}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{t(slide.body)}</p>
        </div>

        <div className="mt-5 flex justify-center gap-1.5">
          {SLIDES.map((_, j) => (
            <span key={j} className={`h-1.5 rounded-full transition-all ${j === i ? "w-5 bg-[var(--accent)]" : "w-1.5 bg-[var(--ring-track)]"}`} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button onClick={finish} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            {t("Skip")}
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <Button variant="ghost" onClick={() => setI((n) => n - 1)}>
                {t("Back")}
              </Button>
            )}
            <Button onClick={() => (last ? finish() : setI((n) => n + 1))}>
              {last ? t("Let's go") : t("Next")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
