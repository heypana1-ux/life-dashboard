"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { habitsForToday } from "@/lib/habitView";
import { todayISO, timeToMinutes } from "@/lib/date";

/**
 * Local reminders. By explicit choice this fires ONLY while the app/tab (or the
 * home-screen web app) is open — there is no backend push. When the current time has
 * reached the user's check-in time and the day isn't logged yet, it shows one local
 * notification, debounced to once per day via settings.reminders.firedToday.
 */
export function Reminders() {
  const { data, updateSettings } = useStore();
  const t = useT();
  const firedRef = useRef(false);

  const r = data.settings.reminders;

  useEffect(() => {
    if (!r?.enabled || !r.checkinTime) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const check = () => {
      if (Notification.permission !== "granted") return;
      const today = todayISO();
      if (r.firedToday?.includes(today) || firedRef.current) return;

      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (nowMin < timeToMinutes(r.checkinTime!)) return;

      // Already did the daily check-in? Then no need to nudge.
      const reviewed = data.reviews.some((x) => x.date === today);
      const openHabits = habitsForToday(data, today).filter(
        (h) => h.habit.kind === "build" && !h.log?.done,
      ).length;
      if (reviewed && !(r.habitReminders && openHabits > 0)) {
        // nothing to remind about, but still mark the day so we don't re-check constantly
        firedRef.current = true;
        markFired(today);
        return;
      }

      const body =
        r.habitReminders && openHabits > 0
          ? t("{n} goals still open — take a minute to log your day.", { n: openHabits })
          : t("Take a minute to log your day.");
      try {
        new Notification(t("Life Dashboard — daily check-in"), {
          body,
          icon: "/icon.svg",
          tag: "life-dashboard-checkin",
        });
      } catch {
        /* ignore */
      }
      firedRef.current = true;
      markFired(today);
    };

    const markFired = (today: string) => {
      const prev = data.settings.reminders.firedToday ?? [];
      if (prev.includes(today)) return;
      // keep only the last few days
      const next = [...prev, today].slice(-7);
      updateSettings({ reminders: { ...data.settings.reminders, firedToday: next } });
    };

    check();
    const id = window.setInterval(check, 60000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.enabled, r?.checkinTime, r?.habitReminders, data.reviews, data.habitLogs]);

  return null;
}
