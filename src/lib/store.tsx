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
  Experiment,
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
  WorkoutPlan,
  SCHEMA_VERSION,
} from "./types";
import { emptyData, uid } from "./defaults";
import { todayISO } from "./date";
import { supabase, isSyncConfigured, SYNC_TABLE } from "./supabase";
import type { Session } from "@supabase/supabase-js";

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
const BACKUP_KEY = "life-dashboard:last-good";
const UPDATED_KEY = "life-dashboard:updatedAt";

/*
  Persistence layer. Everything is kept in one JSON blob in localStorage. The public API
  below is intentionally the only way pages mutate data — so the backend can later be
  swapped (e.g. Supabase) by reimplementing these methods without touching the UI.
*/

/** Merge any (possibly older) blob onto a fresh base so new collections/fields exist. */
export function normalizeData(parsed: Partial<AppData> | null | undefined): AppData {
  const base = emptyData();
  if (!parsed || !parsed.schemaVersion || parsed.schemaVersion > SCHEMA_VERSION) return base;
  return {
    ...base,
    ...parsed,
    schemaVersion: SCHEMA_VERSION,
    settings: {
      ...base.settings,
      ...parsed.settings,
      profile: { ...base.settings.profile, ...parsed.settings?.profile },
      reminders: { ...base.settings.reminders, ...parsed.settings?.reminders },
      dayFlow: { ...base.settings.dayFlow!, ...parsed.settings?.dayFlow },
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
    workoutPlans: parsed.workoutPlans ?? [],
    projects: parsed.projects ?? [],
    experiments: parsed.experiments ?? [],
  };
}

function loadData(): AppData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    return normalizeData(JSON.parse(raw) as AppData);
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
  savePlan: (p: WorkoutPlan) => WorkoutPlan;
  removePlan: (id: string) => void;
  /* projects */
  saveProject: (p: Project) => Project;
  moveProject: (id: string, column: number) => void;
  removeProject: (id: string) => void;
  /* experiments */
  saveExperiment: (e: Experiment) => Experiment;
  removeExperiment: (id: string) => void;
  /* cloud sync */
  sync: SyncState;
  /* bulk */
  replaceAll: (d: AppData) => void;
  resetAll: () => void;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export interface SyncState {
  /** Whether Supabase env vars are configured at all. */
  configured: boolean;
  /** Signed-in user's email, or null. */
  email: string | null;
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: number | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
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
      const json = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, json);
      // Keep a rolling "last good" copy as a corruption safety net.
      localStorage.setItem(BACKUP_KEY, json);
      localStorage.setItem(UPDATED_KEY, String(Date.now()));
    } catch {
      /* ignore quota errors */
    }
  }, [data, ready]);

  const mutate = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => fn(structuredCloneSafe(prev)));
  }, []);

  /* ---------------- Cloud sync (optional, Supabase) ---------------- */
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const [session, setSession] = useState<Session | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const reconciled = useRef(false);
  const syncedJson = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set right before an explicit sign-in: on a fresh device the account's cloud
  // data must win over the just-seeded local data, regardless of timestamps.
  const forceRemote = useRef(false);

  const pushRemote = useCallback(async (userId: string, d: AppData) => {
    if (!supabase) return;
    setSyncStatus("syncing");
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from(SYNC_TABLE).upsert({ user_id: userId, data: d, updated_at: nowIso });
    if (error) {
      setSyncStatus("error");
      setSyncError(error.message);
      return;
    }
    syncedJson.current = JSON.stringify(d);
    try {
      localStorage.setItem(UPDATED_KEY, String(Date.parse(nowIso)));
    } catch {}
    setSyncStatus("synced");
    setSyncError(null);
    setLastSyncedAt(Date.now());
  }, []);

  const reconcile = useCallback(
    async (userId: string) => {
      if (!supabase) return;
      setSyncStatus("syncing");
      const { data: row, error } = await supabase
        .from(SYNC_TABLE)
        .select("data, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        setSyncStatus("error");
        setSyncError(error.message);
        return;
      }
      if (!row) {
        await pushRemote(userId, dataRef.current);
      } else {
        const remoteMs = Date.parse(row.updated_at);
        const localMs = Number(localStorage.getItem(UPDATED_KEY) || "0");
        if (forceRemote.current || remoteMs >= localMs) {
          const remote = normalizeData(row.data as AppData);
          syncedJson.current = JSON.stringify(remote);
          setData(remote);
          try {
            localStorage.setItem(UPDATED_KEY, String(remoteMs));
          } catch {}
          setSyncStatus("synced");
          setSyncError(null);
          setLastSyncedAt(Date.now());
        } else {
          await pushRemote(userId, dataRef.current);
        }
      }
      forceRemote.current = false;
      reconciled.current = true;
    },
    [pushRemote],
  );

  // Track the auth session.
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      reconciled.current = false;
      syncedJson.current = null;
      setSession(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // On login: pull-or-push once.
  useEffect(() => {
    if (!supabase || !ready || !session || reconciled.current) return;
    reconcile(session.user.id);
  }, [session, ready, reconcile]);

  // Push local changes (debounced) once reconciled.
  useEffect(() => {
    if (!supabase || !session || !reconciled.current) return;
    if (JSON.stringify(data) === syncedJson.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => pushRemote(session.user.id, dataRef.current), 1500);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [data, session, pushRemote]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "not configured" };
    // Signing into an existing account means "bring my cloud data here" — let the
    // remote copy win this first reconcile even if local was just seeded.
    forceRemote.current = true;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) forceRemote.current = false;
    return error ? { error: error.message } : {};
  }, []);
  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "not configured" };
    const { error } = await supabase.auth.signUp({ email, password });
    return error ? { error: error.message } : {};
  }, []);
  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    reconciled.current = false;
    syncedJson.current = null;
    forceRemote.current = false;
    setSyncStatus("idle");
    setLastSyncedAt(null);
  }, []);
  const syncNow = useCallback(async () => {
    if (!supabase || !session) return;
    await pushRemote(session.user.id, dataRef.current);
  }, [session, pushRemote]);

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
      savePlan: (p) => {
        const plan: WorkoutPlan = p.id
          ? p
          : { ...p, id: uid("plan"), createdAt: new Date().toISOString() };
        mutate((d) => {
          const others = d.workoutPlans.filter((x) => x.id !== plan.id);
          return { ...d, workoutPlans: [...others, plan] };
        });
        return plan;
      },
      removePlan: (id) =>
        mutate((d) => ({ ...d, workoutPlans: d.workoutPlans.filter((x) => x.id !== id) })),

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

      /* experiments */
      saveExperiment: (e) => {
        const exp: Experiment = e.id
          ? e
          : { ...e, id: uid("exp"), createdAt: new Date().toISOString() };
        mutate((d) => {
          const others = d.experiments.filter((x) => x.id !== exp.id);
          return { ...d, experiments: [...others, exp] };
        });
        return exp;
      },
      removeExperiment: (id) =>
        mutate((d) => ({ ...d, experiments: d.experiments.filter((x) => x.id !== id) })),

      sync: {
        configured: isSyncConfigured,
        email: session?.user?.email ?? null,
        status: syncStatus,
        error: syncError,
        lastSyncedAt,
        signIn,
        signUp,
        signOut,
        syncNow,
      },

      replaceAll: (d) => setData(d),
      resetAll: () => setData(emptyData()),
    }),
    [
      data,
      ready,
      mutate,
      session,
      syncStatus,
      syncError,
      lastSyncedAt,
      signIn,
      signUp,
      signOut,
      syncNow,
    ],
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
