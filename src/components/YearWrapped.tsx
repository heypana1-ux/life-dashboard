"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ImageDown, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT, useLang } from "@/lib/i18n";
import { buildYearWrapped, areaLabelKey } from "@/lib/yearWrapped";
import { downloadWrappedImage } from "@/lib/reportImage";
import { fmtDuration, fmtShort } from "@/lib/date";
import { AREA_LABELS } from "@/lib/defaults";

interface Slide {
  emoji: string;
  value: string;
  label: string;
  sub?: string;
}

export function YearWrappedOverlay({ year, onClose }: { year: number; onClose: () => void }) {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const lang = useLang();
  const [i, setI] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const w = useMemo(() => buildYearWrapped(data, d.history, year), [data, d.history, year]);

  const slides = useMemo<Slide[]>(() => {
    const s: Slide[] = [];
    s.push({ emoji: "🎉", value: String(year), label: t("Your year in review"), sub: t("{n} days logged", { n: w.daysLogged }) });
    if (w.avgScore > 0) s.push({ emoji: "📊", value: String(w.avgScore), label: t("Average Life Score"), sub: w.bestDay ? t("Best day {d} · {n}", { d: fmtShort(w.bestDay.date), n: w.bestDay.score }) : undefined });
    if (w.longestStreak >= 2) s.push({ emoji: "🔥", value: `${w.longestStreak}`, label: t("Longest streak (days)"), sub: t("Consistency compounds.") });
    if (w.workouts > 0) s.push({ emoji: "💪", value: String(w.workouts), label: t("Workouts"), sub: [fmtDuration(w.workoutMinutes), w.distanceKm > 0 ? `${w.distanceKm} km` : ""].filter(Boolean).join(" · ") });
    if (w.topHabit) s.push({ emoji: "✅", value: w.topHabit.name, label: t("Your top habit"), sub: t("Done {n} times", { n: w.topHabit.count }) });
    if (w.topArea) s.push({ emoji: "⭐", value: t(AREA_LABELS[w.topArea.key] ?? areaLabelKey(w.topArea.key)), label: t("Your strongest area"), sub: t("Avg {n}", { n: w.topArea.value }) });
    if (w.bestMonth) s.push({ emoji: "📅", value: new Date(year, w.bestMonth.monthIndex, 1).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { month: "long" }), label: t("Your best month"), sub: t("Avg {n}", { n: w.bestMonth.avg }) });
    if (w.journalEntries > 0 || w.sleepAvgMin > 0) s.push({ emoji: "📖", value: w.journalEntries > 0 ? String(w.journalEntries) : fmtDuration(w.sleepAvgMin), label: w.journalEntries > 0 ? t("Journal entries") : t("Average sleep"), sub: w.journalEntries > 0 && w.sleepAvgMin > 0 ? t("Avg sleep {d}", { d: fmtDuration(w.sleepAvgMin) }) : undefined });
    s.push({ emoji: "🏆", value: t("Level {n}", { n: w.level }), label: t("Where you finished"), sub: t("{xp} XP · {a} achievements", { xp: w.totalXP.toLocaleString(), a: w.achievements }) });
    return s;
  }, [w, t, lang, year]);

  const total = slides.length;
  const next = () => setI((x) => Math.min(total - 1, x + 1));
  const prev = () => setI((x) => Math.max(0, x - 1));

  function shareImage() {
    const tiles: { label: string; value: string }[] = [];
    if (w.daysLogged > 0) tiles.push({ label: t("Days logged"), value: String(w.daysLogged) });
    if (w.avgScore > 0) tiles.push({ label: t("Average Life Score"), value: String(w.avgScore) });
    if (w.longestStreak >= 2) tiles.push({ label: t("Longest streak (days)"), value: String(w.longestStreak) });
    if (w.workouts > 0) tiles.push({ label: t("Workouts"), value: String(w.workouts) });
    if (w.journalEntries > 0) tiles.push({ label: t("Journal entries"), value: String(w.journalEntries) });
    if (w.topHabit) tiles.push({ label: t("Your top habit"), value: w.topHabit.name });
    tiles.push({ label: t("Level"), value: String(w.level) });
    if (w.achievements > 0) tiles.push({ label: t("Achievements"), value: String(w.achievements) });
    downloadWrappedImage(
      {
        kicker: t("Year in review").toUpperCase(),
        year: String(year),
        subtitle: t("{n} days logged", { n: w.daysLogged }),
        tiles: tiles.slice(0, 8),
        footer: t("Life Dashboard"),
      },
      `wrapped-${year}.png`,
    );
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setI((x) => Math.min(total - 1, x + 1));
      else if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, onClose]);

  if (!mounted) return null;
  const slide = slides[Math.min(i, total - 1)];

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="grad relative flex w-full max-w-md flex-col overflow-hidden text-white sm:my-4 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Story progress bars */}
        <div className="flex gap-1 px-4 pt-4">
          {slides.map((_, idx) => (
            <div key={idx} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: idx <= i ? "100%" : "0%" }} />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/80">{t("Wrapped")} {year}</span>
          <div className="flex items-center gap-1">
            <button onClick={shareImage} className="rounded-full p-1 text-white/80 hover:bg-white/15" aria-label={t("Share as image")}>
              <ImageDown size={19} />
            </button>
            <button onClick={onClose} className="rounded-full p-1 text-white/80 hover:bg-white/15" aria-label={t("Close")}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Slide content */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
          <div className="mb-6 text-6xl" key={`e-${i}`} style={{ animation: "checkPop 0.4s ease" }}>{slide.emoji}</div>
          <div className="text-4xl font-extrabold leading-tight sm:text-5xl">{slide.value}</div>
          <div className="mt-3 text-lg font-medium text-white/90">{slide.label}</div>
          {slide.sub && <div className="mt-2 text-sm text-white/75">{slide.sub}</div>}
        </div>

        {/* Tap zones + arrows */}
        <button className="absolute inset-y-0 left-0 w-1/3" onClick={prev} aria-label={t("Previous")} />
        <button className="absolute inset-y-0 right-0 w-1/3" onClick={next} aria-label={t("Next")} />

        <div className="flex items-center justify-between px-4 pb-5">
          <button onClick={prev} disabled={i === 0} className="rounded-full bg-white/15 p-2 disabled:opacity-30" aria-label={t("Previous")}>
            <ChevronLeft size={18} />
          </button>
          {i === total - 1 ? (
            <button onClick={onClose} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[var(--accent)]">
              {t("Done")}
            </button>
          ) : (
            <span className="text-xs text-white/70">{i + 1} / {total}</span>
          )}
          <button onClick={next} disabled={i === total - 1} className="rounded-full bg-white/15 p-2 disabled:opacity-30" aria-label={t("Next")}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
