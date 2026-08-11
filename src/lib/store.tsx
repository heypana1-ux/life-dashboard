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
  FinanceAccount,
  Goal,
  Habit,
  HabitLog,
  Holding,
  JournalEntry,
  Liability,
  Profile,
  Project,
  SleepLog,
  Settings,
  Transaction,
  WeightLog,
  Workout,
  SCHEMA_VERSION,
} from "./types";
import { emptyData, uid } from "./defaults";
import { todayISO } from "./date";

/** Net worth = assets + investment value − liabilities. */
export function computeNetWorth(f: AppData["finances"]): number {
  const assets = f.accounts.reduce((s, a) => s + a.value, 0);
  const invest = f.holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
  const debt = f.liabilities.reduce((s, l) => s + l.balance, 0);
  return Math.round(assets + invest - debt);
}

/** Upsert today's net-worth snapshot after any finance change. */
function withNetWorthSnapshot(f: AppData["finances"]): AppData["finances"] {
  const today = todayISO();
  const value = computeNetWorth(f);
  const history = f.history.filter((p) => p.date !== today);
  history.push({ date: today, value });
  history.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { ...f, history };
}

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
      schemaVersion: SCHEMA_VERSION,
      settings: {
        ...base.settings,
        ...parsed.settings,
        profile: { ...base.settings.profile, ...parsed.settings?.profile },
      },
      habits: parsed.habits ?? [],
      habitLogs: parsed.habitLogs ?? [],
      reviews: parsed.reviews ?? [],
      sleep: parsed.sleep ?? [],
      journal: parsed.journal ?? [],
      goals: parsed.goals ?? [],
      weight: parsed.weight ?? [],
      finances: { ...base.finances, ...parsed.finances },
      workouts: parsed.workouts ?? [],
      projects: parsed.projects ?? [],
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
  /* profile & weight */
  updateProfile: (patch: Partial<Profile>) => void;
  saveWeight: (w: WeightLog) => void;
  removeWeight: (date: string) => void;
  /* finances */
  setCurrency: (c: string) => void;
  saveAccount: (a: FinanceAccount) => void;
  removeAccount: (id: string) => void;
  saveLiability: (l: Liability) => void;
  removeLiability: (id: string) => void;
  saveHolding: (h: Holding) => void;
  removeHolding: (id: string) => void;
  saveTransaction: (t: Transaction) => void;
  removeTransaction: (id: string) => void;
  /* workouts */
  saveWorkout: (w: Workout) => Workout;
  removeWorkout: (id: string) => void;
  /* projects */
  saveProject: (p: Project) => Project;
  moveProject: (id: string, column: number) => void;
  removeProject: (id: string) => void;
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

      /* profile & weight */
      updateProfile: (patch) =>
        mutate((d) => ({
          ...d,
          settings: { ...d.settings, profile: { ...d.settings.profile, ...patch } },
        })),
      saveWeight: (w) =>
        mutate((d) => {
          const others = d.weight.filter((x) => x.date !== w.date);
          return { ...d, weight: [...others, w].sort((a, b) => (a.date < b.date ? -1 : 1)) };
        }),
      removeWeight: (date) =>
        mutate((d) => ({ ...d, weight: d.weight.filter((x) => x.date !== date) })),

      /* finances */
      setCurrency: (c) =>
        mutate((d) => ({ ...d, finances: { ...d.finances, currency: c } })),
      saveAccount: (a) =>
        mutate((d) => {
          const account: FinanceAccount = a.id ? a : { ...a, id: uid("acc") };
          const accounts = d.finances.accounts.some((x) => x.id === account.id)
            ? d.finances.accounts.map((x) => (x.id === account.id ? account : x))
            : [...d.finances.accounts, account];
          return { ...d, finances: withNetWorthSnapshot({ ...d.finances, accounts }) };
        }),
      removeAccount: (id) =>
        mutate((d) => ({
          ...d,
          finances: withNetWorthSnapshot({
            ...d.finances,
            accounts: d.finances.accounts.filter((x) => x.id !== id),
          }),
        })),
      saveLiability: (l) =>
        mutate((d) => {
          const lia: Liability = l.id ? l : { ...l, id: uid("lia") };
          const liabilities = d.finances.liabilities.some((x) => x.id === lia.id)
            ? d.finances.liabilities.map((x) => (x.id === lia.id ? lia : x))
            : [...d.finances.liabilities, lia];
          return { ...d, finances: withNetWorthSnapshot({ ...d.finances, liabilities }) };
        }),
      removeLiability: (id) =>
        mutate((d) => ({
          ...d,
          finances: withNetWorthSnapshot({
            ...d.finances,
            liabilities: d.finances.liabilities.filter((x) => x.id !== id),
          }),
        })),
      saveHolding: (h) =>
        mutate((d) => {
          const hold: Holding = h.id ? h : { ...h, id: uid("hold") };
          const holdings = d.finances.holdings.some((x) => x.id === hold.id)
            ? d.finances.holdings.map((x) => (x.id === hold.id ? hold : x))
            : [...d.finances.holdings, hold];
          return { ...d, finances: withNetWorthSnapshot({ ...d.finances, holdings }) };
        }),
      removeHolding: (id) =>
        mutate((d) => ({
          ...d,
          finances: withNetWorthSnapshot({
            ...d.finances,
            holdings: d.finances.holdings.filter((x) => x.id !== id),
          }),
        })),
      saveTransaction: (t) =>
        mutate((d) => {
          const tx: Transaction = t.id ? t : { ...t, id: uid("tx") };
          const transactions = d.finances.transactions.some((x) => x.id === tx.id)
            ? d.finances.transactions.map((x) => (x.id === tx.id ? tx : x))
            : [...d.finances.transactions, tx];
          return { ...d, finances: { ...d.finances, transactions } };
        }),
      removeTransaction: (id) =>
        mutate((d) => ({
          ...d,
          finances: {
            ...d.finances,
            transactions: d.finances.transactions.filter((x) => x.id !== id),
          },
        })),

      /* workouts */
      saveWorkout: (w) => {
        const workout: Workout = w.id ? w : { ...w, id: uid("wk") };
        mutate((d) => {
          const others = d.workouts.filter((x) => x.id !== workout.id);
          return { ...d, workouts: [...others, workout] };
        });
        return workout;
      },
      removeWorkout: (id) =>
        mutate((d) => ({ ...d, workouts: d.workouts.filter((x) => x.id !== id) })),

      /* projects */
      saveProject: (p) => {
        const now = new Date().toISOString();
        const project: Project = p.id
          ? { ...p, updatedAt: now }
          : { ...p, id: uid("proj"), createdAt: now, updatedAt: now };
        mutate((d) => {
          const others = d.projects.filter((x) => x.id !== project.id);
          return { ...d, projects: [...others, project] };
        });
        return project;
      },
      moveProject: (id, column) =>
        mutate((d) => ({
          ...d,
          projects: d.projects.map((x) =>
            x.id === id ? { ...x, column, updatedAt: new Date().toISOString() } : x,
          ),
        })),
      removeProject: (id) =>
        mutate((d) => ({ ...d, projects: d.projects.filter((x) => x.id !== id) })),

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
