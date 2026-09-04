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
  BodyMeasurement,
  WheelCheck,
  Budget,
  SavingsGoal,
  DailyReview,
  CoachChatThread,
  Experiment,
  FinanceAccount,
  FocusSession,
  Goal,
  Habit,
  HabitLog,
  Holding,
  JournalEntry,
  Liability,
  Profile,
  Project,
  VisionItem,
  RewardItem,
  Redemption,
  HealthLog,
  FocusDay,
  RecurringTx,
  SleepLog,
  Settings,
  Transaction,
  WeightLog,
  WeeklyReview,
  WeeklyPlan,
  Workout,
  WorkoutPlan,
  SCHEMA_VERSION,
} from "./types";
import { emptyData, uid, DEFAULT_AREAS } from "./defaults";
import { dueRecurring } from "./finance";
import { todayISO, addDays, weekdayOf } from "./date";
import type { Accent } from "./types";
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
/** Keep a stored areas list but append any default areas it doesn't have yet. */
function mergeAreas(stored: AppData["settings"]["areas"]): AppData["settings"]["areas"] {
  const keys = new Set(stored.map((a) => a.key));
  const extra = DEFAULT_AREAS.filter((d) => !keys.has(d.key)).map((d) => ({ ...d }));
  return [...stored, ...extra];
}

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
      // Append any newer default areas (e.g. Health) that a stored profile predates.
      areas: mergeAreas(parsed.settings?.areas ?? base.settings.areas),
      profile: { ...base.settings.profile, ...parsed.settings?.profile },
      reminders: { ...base.settings.reminders, ...parsed.settings?.reminders },
      dayFlow: { ...base.settings.dayFlow!, ...parsed.settings?.dayFlow },
    },
    habits: parsed.habits ?? [],
    habitLogs: parsed.habitLogs ?? [],
    reviews: parsed.reviews ?? [],
    weeklyReviews: parsed.weeklyReviews ?? [],
    weeklyPlans: parsed.weeklyPlans ?? [],
    sleep: parsed.sleep ?? [],
    journal: parsed.journal ?? [],
    goals: parsed.goals ?? [],
    weight: parsed.weight ?? [],
    measurements: parsed.measurements ?? [],
    wheelChecks: parsed.wheelChecks ?? [],
    health: parsed.health ?? [],
    focus: parsed.focus ?? [],
    focusSessions: parsed.focusSessions ?? [],
    visionItems: parsed.visionItems ?? [],
    coachChats: parsed.coachChats ?? [],
    finances: {
      ...base.finances,
      ...parsed.finances,
      recurring: parsed.finances?.recurring ?? [],
      budgets: parsed.finances?.budgets ?? [],
      savingsGoals: parsed.finances?.savingsGoals ?? [],
    },
    workouts: parsed.workouts ?? [],
    workoutPlans: parsed.workoutPlans ?? [],
    projects: parsed.projects ?? [],
    experiments: parsed.experiments ?? [],
    rewards: {
      items: parsed.rewards?.items ?? [],
      redemptions: parsed.rewards?.redemptions ?? [],
      owned: parsed.rewards?.owned ?? [],
      challengeClaims: parsed.rewards?.challengeClaims ?? [],
      questClaims: parsed.rewards?.questClaims ?? [],
    },
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
  saveWeeklyReview: (r: WeeklyReview) => void;
  saveWeeklyPlan: (p: WeeklyPlan) => void;
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
  /* body measurements */
  saveMeasurement: (m: BodyMeasurement) => void;
  removeMeasurement: (site: string, date: string) => void;
  /** Set (or clear, with target<=0) a target for weight ("weight") or a body site. */
  setMeasurementTarget: (key: string, target: number) => void;
  /* wheel of life */
  saveWheelCheck: (w: WheelCheck) => WheelCheck;
  removeWheelCheck: (id: string) => void;
  /* health */
  saveHealth: (h: HealthLog) => void;
  /* focus (morning top 3) */
  setFocus: (date: string, items: FocusDay["items"]) => void;
  /* focus sessions (deep work timer) */
  addFocusSession: (minutes: number, label?: string) => void;
  removeFocusSession: (id: string) => void;
  /* vision board */
  saveVisionItem: (v: VisionItem) => VisionItem;
  removeVisionItem: (id: string) => void;
  /* coach chats */
  saveCoachChat: (chat: CoachChatThread) => void;
  removeCoachChat: (id: string) => void;
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
  saveRecurring: (r: RecurringTx) => void;
  removeRecurring: (id: string) => void;
  saveBudget: (b: Budget) => void;
  removeBudget: (category: string) => void;
  saveSavingsGoal: (g: SavingsGoal) => void;
  removeSavingsGoal: (id: string) => void;
  /** Book any recurring rules that are due; returns how many were booked. */
  runRecurring: () => number;
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
  /* reward shop */
  saveReward: (r: RewardItem) => RewardItem;
  removeReward: (id: string) => void;
  redeemReward: (item: RewardItem) => void;
  undoRedemption: (id: string) => void;
  /** Claim a completed weekly challenge for XP (idempotent per week). */
  claimChallenge: (id: string) => void;
  /** Claim a completed daily quest for points (idempotent per day). */
  claimQuest: (id: string) => void;
  /** Buy a cosmetic accent theme with points; deducts points and marks it owned + applies it. */
  buyCosmetic: (accent: Accent, cost: number, name: string) => void;
  /** Buy any prefixed cosmetic id (e.g. "ring:ember", "title:iron") with points; marks it owned. */
  purchaseCosmetic: (id: string, cost: number, name: string) => void;
  /* cloud sync */
  sync: SyncState;
  /* bulk */
  replaceAll: (d: AppData) => void;
  resetAll: () => void;
  /** True when a save was rejected because storage is full. */
  storageFull: boolean;
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
  /** Deletes the cloud account and its synced data (Art. 17 GDPR / store requirement).
   *  Local data is untouched — the caller decides whether to wipe the device too. */
  deleteAccount: () => Promise<{ error?: string }>;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => emptyData());
  const [ready, setReady] = useState(false);
  const first = useRef(true);
  /** True once a save was rejected (quota). Surfaced in the UI — never swallowed. */
  const [storageFull, setStorageFull] = useState(false);
  const lastBackupWrite = useRef(0);

  useEffect(() => {
    // Hydrate from localStorage after mount (avoids SSR/client mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(loadData());
    setReady(true);
  }, []);

  /*
    Persist on change (after initial hydration).

    Two things this must not do, both of which it used to. It must not write the whole blob
    twice on every keystroke — the "last good" copy doubled the storage cost for a safety net
    that only needs to be recent, not current. And it must never swallow a failed write: on a
    full quota the app kept running happily on in-memory state and everything since the first
    failure disappeared on reload. Now a failure is surfaced, so the user can export and make
    room instead of losing the day.
  */
  useEffect(() => {
    if (!ready) return;
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, json);
      localStorage.setItem(UPDATED_KEY, String(Date.now()));
      // Refresh the corruption safety net at most once a minute.
      if (Date.now() - lastBackupWrite.current > 60_000) {
        try {
          localStorage.setItem(BACKUP_KEY, json);
          lastBackupWrite.current = Date.now();
        } catch {
          // A backup that doesn't fit is not worth failing the real save over — drop the
          // stale copy so the next successful write has room for a fresh one.
          try {
            localStorage.removeItem(BACKUP_KEY);
          } catch {
            /* nothing else to try */
          }
        }
      }
      // Clearing the warning from inside the persist effect is the point: the only proof that
      // storage works again is a write that succeeded.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (storageFull) setStorageFull(false);
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStorageFull(true);
    }
  }, [data, ready, storageFull]);

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
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // When the email already exists, Supabase (to avoid leaking that) returns a user with an
    // empty `identities` array and no error instead of failing — treat that as "already taken".
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { error: "already_registered" };
    }
    return {};
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

  const deleteAccount = useCallback(async () => {
    if (!supabase || !session) return { error: "not_signed_in" };
    // Stop the debounced push first, or it would re-create the row we are about to delete.
    if (pushTimer.current) clearTimeout(pushTimer.current);
    reconciled.current = false;
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: String(body.error ?? "failed") };
    }
    await supabase.auth.signOut();
    syncedJson.current = null;
    forceRemote.current = false;
    setSyncStatus("idle");
    setLastSyncedAt(null);
    return {};
  }, [session]);

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
          const stamp = new Date().toISOString();
          if (idx >= 0) {
            const cur = logs[idx];
            const nowDone = !cur.done;
            // Record the clock time the habit was completed, so "smart" reminder times can be
            // learned from when you actually do things (only stamped when it becomes done).
            logs[idx] = { ...cur, done: nowDone, ...(nowDone ? { doneAt: stamp } : {}), ...extra };
          } else {
            logs.push({ habitId, date, done: true, doneAt: stamp, ...extra });
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
      saveWeeklyReview: (r) =>
        mutate((d) => {
          const others = d.weeklyReviews.filter((x) => x.weekOf !== r.weekOf);
          return { ...d, weeklyReviews: [...others, r].sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1)) };
        }),
      saveWeeklyPlan: (p) =>
        mutate((d) => {
          const others = d.weeklyPlans.filter((x) => x.weekOf !== p.weekOf);
          return { ...d, weeklyPlans: [...others, p] };
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

      /* body measurements */
      saveMeasurement: (m) =>
        mutate((d) => {
          const others = d.measurements.filter((x) => !(x.site === m.site && x.date === m.date));
          return { ...d, measurements: [...others, m].sort((a, b) => (a.date < b.date ? -1 : 1)) };
        }),
      removeMeasurement: (site, date) =>
        mutate((d) => ({ ...d, measurements: d.measurements.filter((x) => !(x.site === site && x.date === date)) })),
      setMeasurementTarget: (key, target) =>
        mutate((d) => {
          const others = (d.settings.measurementGoals ?? []).filter((g) => g.key !== key);
          const next = target > 0 ? [...others, { key, target: Math.round(target * 10) / 10 }] : others;
          return { ...d, settings: { ...d.settings, measurementGoals: next } };
        }),

      /* wheel of life */
      saveWheelCheck: (w) => {
        const check: WheelCheck = w.id ? w : { ...w, id: uid("wheel") };
        mutate((d) => {
          const others = d.wheelChecks.filter((x) => x.id !== check.id);
          return { ...d, wheelChecks: [...others, check].sort((a, b) => (a.date < b.date ? -1 : 1)) };
        });
        return check;
      },
      removeWheelCheck: (id) =>
        mutate((d) => ({ ...d, wheelChecks: d.wheelChecks.filter((x) => x.id !== id) })),

      /* health */
      saveHealth: (h) =>
        mutate((d) => {
          const others = d.health.filter((x) => x.date !== h.date);
          return { ...d, health: [...others, h].sort((a, b) => (a.date < b.date ? -1 : 1)) };
        }),

      /* focus */
      setFocus: (date, items) =>
        mutate((d) => {
          const others = d.focus.filter((x) => x.date !== date);
          const clean = items.filter((i) => i.text.trim());
          return { ...d, focus: clean.length ? [...others, { date, items: clean }] : others };
        }),

      /* focus sessions (deep work timer) */
      addFocusSession: (minutes, label) =>
        mutate((d) => {
          const session: FocusSession = {
            id: uid("focus"),
            date: todayISO(),
            minutes: Math.max(1, Math.round(minutes)),
            label: label?.trim() || undefined,
            startedAt: new Date().toISOString(),
          };
          return { ...d, focusSessions: [...d.focusSessions, session] };
        }),
      removeFocusSession: (id) =>
        mutate((d) => ({ ...d, focusSessions: d.focusSessions.filter((x) => x.id !== id) })),

      /* vision board */
      saveVisionItem: (v) => {
        const item: VisionItem = v.id ? v : { ...v, id: uid("vision") };
        mutate((d) => {
          const others = d.visionItems.filter((x) => x.id !== item.id);
          return { ...d, visionItems: [...others, item] };
        });
        return item;
      },
      removeVisionItem: (id) =>
        mutate((d) => ({ ...d, visionItems: d.visionItems.filter((x) => x.id !== id) })),

      /* coach chats */
      saveCoachChat: (chat) =>
        mutate((d) => {
          const others = d.coachChats.filter((c) => c.id !== chat.id);
          return { ...d, coachChats: [...others, chat].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)) };
        }),
      removeCoachChat: (id) =>
        mutate((d) => ({ ...d, coachChats: d.coachChats.filter((c) => c.id !== id) })),

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
      saveRecurring: (r) =>
        mutate((d) => {
          const rec: RecurringTx = r.id ? r : { ...r, id: uid("rec") };
          const recurring = d.finances.recurring.some((x) => x.id === rec.id)
            ? d.finances.recurring.map((x) => (x.id === rec.id ? rec : x))
            : [...d.finances.recurring, rec];
          return { ...d, finances: { ...d.finances, recurring } };
        }),
      removeRecurring: (id) =>
        mutate((d) => ({
          ...d,
          finances: {
            ...d.finances,
            recurring: d.finances.recurring.filter((x) => x.id !== id),
          },
        })),
      saveBudget: (b) =>
        mutate((d) => {
          const budgets = d.finances.budgets.some((x) => x.category === b.category)
            ? d.finances.budgets.map((x) => (x.category === b.category ? b : x))
            : [...d.finances.budgets, b];
          return { ...d, finances: { ...d.finances, budgets } };
        }),
      removeBudget: (category) =>
        mutate((d) => ({
          ...d,
          finances: {
            ...d.finances,
            budgets: d.finances.budgets.filter((x) => x.category !== category),
          },
        })),
      saveSavingsGoal: (g) =>
        mutate((d) => {
          const sg: SavingsGoal = g.id ? g : { ...g, id: uid("sg") };
          const savingsGoals = d.finances.savingsGoals.some((x) => x.id === sg.id)
            ? d.finances.savingsGoals.map((x) => (x.id === sg.id ? sg : x))
            : [...d.finances.savingsGoals, sg];
          return { ...d, finances: { ...d.finances, savingsGoals } };
        }),
      removeSavingsGoal: (id) =>
        mutate((d) => ({
          ...d,
          finances: {
            ...d.finances,
            savingsGoals: d.finances.savingsGoals.filter((x) => x.id !== id),
          },
        })),
      runRecurring: () => {
        const { due } = dueRecurring(dataRef.current.finances.recurring, todayISO());
        if (due.length === 0) return 0;
        mutate((d) => {
          const { due: dd, updatedRules } = dueRecurring(d.finances.recurring, todayISO());
          const newTxs: Transaction[] = dd.map((x) => ({
            id: uid("tx"),
            date: x.date,
            type: x.rule.type,
            category: x.rule.category,
            amount: x.rule.amount,
            note: x.rule.note,
          }));
          return {
            ...d,
            finances: {
              ...d.finances,
              transactions: [...d.finances.transactions, ...newTxs],
              recurring: updatedRules,
            },
          };
        });
        return due.length;
      },

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

      /* reward shop */
      saveReward: (r) => {
        const item: RewardItem = r.id ? r : { ...r, id: uid("rw") };
        mutate((d) => {
          const others = d.rewards.items.filter((x) => x.id !== item.id);
          return { ...d, rewards: { ...d.rewards, items: [...others, item] } };
        });
        return item;
      },
      removeReward: (id) =>
        mutate((d) => ({ ...d, rewards: { ...d.rewards, items: d.rewards.items.filter((x) => x.id !== id) } })),
      redeemReward: (item) =>
        mutate((d) => {
          const redemption: Redemption = { id: uid("rd"), name: item.name, cost: item.cost, date: new Date().toISOString() };
          return { ...d, rewards: { ...d.rewards, redemptions: [...d.rewards.redemptions, redemption] } };
        }),
      undoRedemption: (id) =>
        mutate((d) => ({ ...d, rewards: { ...d.rewards, redemptions: d.rewards.redemptions.filter((x) => x.id !== id) } })),
      claimChallenge: (id) =>
        mutate((d) => {
          const week = addDays(todayISO(), -weekdayOf(todayISO())); // this week's Sunday anchor
          const claims = d.rewards.challengeClaims ?? [];
          if (claims.some((c) => c.week === week && c.id === id)) return d;
          return { ...d, rewards: { ...d.rewards, challengeClaims: [...claims, { week, id }] } };
        }),
      claimQuest: (id) =>
        mutate((d) => {
          const date = todayISO();
          const claims = d.rewards.questClaims ?? [];
          if (claims.some((c) => c.date === date && c.id === id)) return d;
          return { ...d, rewards: { ...d.rewards, questClaims: [...claims, { date, id }] } };
        }),
      buyCosmetic: (accent, cost, name) =>
        mutate((d) => {
          const owned = d.rewards.owned ?? [];
          if (owned.includes(accent)) return d;
          const redemption: Redemption = { id: uid("rd"), name, cost, date: new Date().toISOString() };
          return {
            ...d,
            settings: { ...d.settings, accent },
            rewards: {
              ...d.rewards,
              owned: [...owned, accent],
              redemptions: [...d.rewards.redemptions, redemption],
            },
          };
        }),
      purchaseCosmetic: (id, cost, name) =>
        mutate((d) => {
          const owned = d.rewards.owned ?? [];
          if (owned.includes(id)) return d;
          const redemption: Redemption = { id: uid("rd"), name, cost, date: new Date().toISOString() };
          return {
            ...d,
            rewards: {
              ...d.rewards,
              owned: [...owned, id],
              redemptions: [...d.rewards.redemptions, redemption],
            },
          };
        }),

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
        deleteAccount,
      },

      replaceAll: (d) => setData(d),
      resetAll: () => setData(emptyData()),
      storageFull,
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
      deleteAccount,
      storageFull,
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
