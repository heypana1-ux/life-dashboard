"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppData,
  DailyReview,
  Goal,
  Habit,
  HabitLog,
  JournalEntry,
  SleepLog,
  Settings,
  SCHEMA_VERSION,
} from "./types";
import { emptyData, uid } from "./defaults";

const STORAGE_KEY = "life-dashboard:v1";

/*
  Persistence layer. Everything is kept in one JSON blob in localStorage. The public API
  below is intentionally the only way pages mutate data — so the backend can later be
  swapped (e.g. Supabase) by reimplementing these methods without touching the UI.
*/

function loadData(): AppData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.schemaVersion || parsed.schemaVersion > SCHEMA_VERSION) return emptyData();
    // shallow-merge to tolerate older blobs missing newer collections
    const base = emptyData();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...parsed.settings },
      habits: parsed.habits ?? [],
      habitLogs: parsed.habitLogs ?? [],
      reviews: parsed.reviews ?? [],
      sleep: parsed.sleep ?? [],
      journal: parsed.journal ?? [],
      goals: parsed.goals ?? [],
    };
  } catch {
    return emptyData();
  }
}

interface StoreCtx {
  data: AppData;
  ready: boolean;
  /* settings */
  updateSettings: (patch: Partial<Settings>) => void;
  setAreas: (areas: Settings["areas"]) => void;
  /* habits */
  addHabit: (h: Omit<Habit, "id" | "createdAt" | "archived">) => Habit;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  removeHabit: (id: string) => void;
  /* habit logs */
  toggleHabit: (habitId: string, date: string, extra?: Partial<HabitLog>) => void;
  setHabitLog: (log: HabitLog) => void;
  /* reviews / sleep */
  saveReview: (r: DailyReview) => void;
  saveSleep: (s: SleepLog) => void;
  /* journal */
  saveJournal: (e: JournalEntry) => JournalEntry;
  removeJournal: (id: string) => void;
  /* goals */
  saveGoal: (g: Goal) => Goal;
  removeGoal: (id: string) => void;
  /* bulk */
  replaceAll: (d: AppData) => void;
  resetAll: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => emptyData());
  const [ready, setReady] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    // Hydrate from localStorage after mount (avoids SSR/client mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(loadData());
    setReady(true);
  }, []);

  // persist on change (after initial hydration)
  useEffect(() => {
    if (!ready) return;
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota errors */
    }
  }, [data, ready]);

  const mutate = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => fn(structuredCloneSafe(prev)));
  }, []);

  const api: StoreCtx = useMemo(
    () => ({
      data,
      ready,
      updateSettings: (patch) =>
        mutate((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      setAreas: (areas) =>
        mutate((d) => ({ ...d, settings: { ...d.settings, areas } })),
      addHabit: (h) => {
        const habit: Habit = {
          ...h,
          id: uid("habit"),
          createdAt: new Date().toISOString().slice(0, 10),
          archived: false,
        };
        mutate((d) => ({ ...d, habits: [...d.habits, habit] }));
        return habit;
      },
      updateHabit: (id, patch) =>
        mutate((d) => ({
          ...d,
          habits: d.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),
      removeHabit: (id) =>
        mutate((d) => ({
          ...d,
          habits: d.habits.filter((h) => h.id !== id),
          habitLogs: d.habitLogs.filter((l) => l.habitId !== id),
        })),
      toggleHabit: (habitId, date, extra) =>
        mutate((d) => {
          const idx = d.habitLogs.findIndex(
            (l) => l.habitId === habitId && l.date === date,
          );
          const logs = [...d.habitLogs];
          if (idx >= 0) {
            const cur = logs[idx];
            logs[idx] = { ...cur, done: !cur.done, ...extra };
          } else {
            logs.push({ habitId, date, done: true, ...extra });
          }
          return { ...d, habitLogs: logs };
        }),
      setHabitLog: (log) =>
        mutate((d) => {
          const idx = d.habitLogs.findIndex(
            (l) => l.habitId === log.habitId && l.date === log.date,
          );
          const logs = [...d.habitLogs];
          if (idx >= 0) logs[idx] = { ...logs[idx], ...log };
          else logs.push(log);
          return { ...d, habitLogs: logs };
        }),
      saveReview: (r) =>
        mutate((d) => {
          const others = d.reviews.filter((x) => x.date !== r.date);
          return { ...d, reviews: [...others, r] };
        }),
      saveSleep: (s) =>
        mutate((d) => {
          const others = d.sleep.filter((x) => x.date !== s.date);
          return { ...d, sleep: [...others, s] };
        }),
      saveJournal: (e) => {
        const entry: JournalEntry = e.id ? e : { ...e, id: uid("jrnl") };
        mutate((d) => {
          const others = d.journal.filter((x) => x.id !== entry.id);
          return { ...d, journal: [...others, entry] };
        });
        return entry;
      },
      removeJournal: (id) =>
        mutate((d) => ({ ...d, journal: d.journal.filter((x) => x.id !== id) })),
      saveGoal: (g) => {
        const goal: Goal = g.id ? g : { ...g, id: uid("goal") };
        mutate((d) => {
          const others = d.goals.filter((x) => x.id !== goal.id);
          return { ...d, goals: [...others, goal] };
        });
        return goal;
      },
      removeGoal: (id) =>
        mutate((d) => ({ ...d, goals: d.goals.filter((x) => x.id !== id) })),
      replaceAll: (d) => setData(d),
      resetAll: () => setData(emptyData()),
    }),
    [data, ready, mutate],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

function structuredCloneSafe<T>(o: T): T {
  if (typeof structuredClone === "function") return structuredClone(o);
  return JSON.parse(JSON.stringify(o));
}
