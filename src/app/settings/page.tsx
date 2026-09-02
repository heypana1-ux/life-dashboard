"use client";

import { useEffect, useState } from "react";
import { Activity, BellRing, Download, HeartPulse, Monitor, Moon, RefreshCw, RotateCcw, Send, Sparkles, Sun, Trash2, Upload, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { Accent, AreaKey, Language, Profile } from "@/lib/types";
import {
  isStravaConfigured,
  authorizeUrl,
  exchangeCode,
  syncStrava,
  loadStrava,
  saveStrava,
  type StravaState,
} from "@/lib/strava";

import Link from "next/link";
import { generateDemo, clearDemo } from "@/lib/demo";
import { useT } from "@/lib/i18n";
import { useDerived } from "@/lib/useDerived";
import { computeLevel } from "@/lib/level";
import { ACCENT_REWARDS, ACCENT_SWATCH, accentOwned } from "@/lib/rewards";
import { todayISO, fmtShort, ageFrom, addDays } from "@/lib/date";
import { Card, PageHeader, SectionTitle, Button, Toggle, Badge, Field, inputCls } from "@/components/ui";
import { InstallAppCard } from "@/components/PWA";
import { pushConfigured, enablePush, disablePush, syncPush, PushError } from "@/lib/push";
import { weeklyRecapText } from "@/lib/weeklyRecap";
import { typicalLogHour } from "@/lib/habitTimes";
import { TrendLine } from "@/components/charts";
import clsx from "clsx";

export default function SettingsPage() {
  const { data, updateSettings, setAreas, replaceAll, resetAll } = useStore();
  const t = useT();
  const s = data.settings;
  const [confirmReset, setConfirmReset] = useState(false);

  const enabledWeightSum = s.areas.filter((a) => a.enabled).reduce((acc, a) => acc + a.weight, 0);

  function setAreaEnabled(key: AreaKey, enabled: boolean) {
    setAreas(s.areas.map((a) => (a.key === key ? { ...a, enabled } : a)));
  }
  function setAreaWeight(key: AreaKey, weight: number) {
    setAreas(s.areas.map((a) => (a.key === key ? { ...a, weight } : a)));
  }
  function normalizedPct(w: number) {
    return enabledWeightSum > 0 ? Math.round((w / enabledWeightSum) * 100) : 0;
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    updateSettings({ lastBackupAt: new Date().toISOString() });
  }
  function importData(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && parsed.settings && Array.isArray(parsed.habits)) replaceAll(parsed);
        else alert("That file doesn't look like a Life Dashboard export.");
      } catch {
        alert("Could not read that file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <PageHeader kicker={t("Tracking & scoring")} lead={t("Your")} title={t("Settings")} subtitle={t("Tune what you track and how your score is computed.")} />

      {/* Install as an app (PWA) */}
      <InstallAppCard />

      {/* Account & cloud sync (only when Supabase is configured) */}
      <AccountCard />

      {/* Profile */}
      <ProfileCard />

      {/* Appearance */}
      <Card>
        <SectionTitle>{t("Appearance")}</SectionTitle>
        <div className="flex gap-2">
          {[
            { k: "light", label: t("Light"), icon: Sun },
            { k: "dark", label: t("Dark"), icon: Moon },
            { k: "system", label: t("System"), icon: Monitor },
          ].map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              onClick={() => updateSettings({ theme: k as typeof s.theme })}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition",
                s.theme === k
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-2)]",
              )}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <div className="mb-2 text-sm font-medium">{t("Density")}</div>
          <div className="flex gap-2">
            {[
              { k: "cozy", label: t("Cozy") },
              { k: "compact", label: t("Compact") },
            ].map(({ k, label }) => (
              <button
                key={k}
                onClick={() => updateSettings({ density: k as "cozy" | "compact" })}
                className={clsx(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition",
                  (s.density ?? "cozy") === k
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--surface-2)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Accent */}
      <AccentCard />

      {/* Language */}
      <Card>
        <SectionTitle>{t("Language")}</SectionTitle>
        <div className="flex gap-2">
          {[
            { k: "en", label: t("English"), flag: "🇬🇧" },
            { k: "de", label: t("German"), flag: "🇩🇪" },
          ].map(({ k, label, flag }) => (
            <button
              key={k}
              onClick={() => updateSettings({ language: k as Language })}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition",
                s.language === k
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-2)]",
              )}
            >
              <span>{flag}</span> {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Areas & weights */}
      <Card>
        <SectionTitle right={<span className="text-xs text-[var(--text-faint)]">{t("normalized to 100%")}</span>}>
          {t("Life areas & score weights")}
        </SectionTitle>
        <div className="space-y-3">
          {s.areas.map((a) => (
            <div key={a.key} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t(a.label)}</span>
                  {a.key === "finances" && <Badge>{t("manual only")}</Badge>}
                  {a.enabled && <Badge tone="accent">{normalizedPct(a.weight)}%</Badge>}
                </div>
                <Toggle checked={a.enabled} onChange={(v) => setAreaEnabled(a.key, v)} />
              </div>
              {a.enabled && a.key !== "finances" && (
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={a.weight}
                  onChange={(e) => setAreaWeight(a.key, Number(e.target.value))}
                  className="mt-3 w-full accent-[var(--accent)]"
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Sleep target */}
      <Card>
        <SectionTitle>{t("Sleep target")}</SectionTitle>
        <Field label={`${Math.round((s.sleepTargetMinutes / 60) * 10) / 10} ${t("hours")}`}>
          <input
            type="range"
            min={300}
            max={600}
            step={15}
            value={s.sleepTargetMinutes}
            onChange={(e) => updateSettings({ sleepTargetMinutes: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </Field>
      </Card>

      {/* Reminders */}
      <div id="reminders" className="scroll-mt-20">
        <RemindersCard />
      </div>

      {/* AI coach */}
      <CoachCard />

      {/* Guided day-flow overlays */}
      <DayFlowCard />

      {/* Streak protection & rest days */}
      <StreakCard />

      {/* Apple Health import */}
      <HealthImportCard />

      {/* Strava (only when configured) */}
      <StravaCard />

      {/* Data */}
      <Card>
        <SectionTitle
          right={
            <span className="text-xs text-[var(--text-faint)]">
              {s.lastBackupAt
                ? `${t("Last backup")}: ${backupAgeLabel(s.lastBackupAt, t)}`
                : t("No backup yet")}
            </span>
          }
        >
          {t("Data")}
        </SectionTitle>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          {t("Your data lives only in this browser. Export a backup regularly so you never lose it.")}
        </p>
        <div className="flex flex-wrap gap-2">
          {s.demoDataLoaded ? (
            <Button variant="outline" onClick={() => replaceAll(clearDemo(data))}>
              <Trash2 size={16} /> {t("Clear demo data")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => replaceAll(generateDemo(data))}>
              {t("Load demo data")}
            </Button>
          )}
          <Button variant="outline" onClick={exportData}>
            <Download size={16} /> {t("Export JSON")}
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-2)]">
            <Upload size={16} /> {t("Import JSON")}
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          </label>
        </div>
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          {!confirmReset ? (
            <Button variant="ghost" onClick={() => setConfirmReset(true)} className="text-[var(--bad)]">
              <RotateCcw size={16} /> {t("Reset everything")}
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[var(--text-muted)]">{t("This deletes all data and restarts onboarding.")}</span>
              <Button variant="danger" size="sm" onClick={resetAll}>{t("Confirm reset")}</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>{t("Cancel")}</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Bugs & feedback */}
      <FeedbackCard />

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={() => updateSettings({ tourDone: false })}>
          {t("Show the tour again")}
        </Button>
      </div>

      <p className="pb-1 text-center text-xs text-[var(--text-faint)]">
        {t("Life Dashboard · your data lives in this browser only.")}
      </p>
      <p className="pb-4 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--area-text)]">
        Pulse Build 14
      </p>
    </div>
  );
}

function CoachCard() {
  const { data, updateSettings } = useStore();
  const t = useT();
  const on = !!data.settings.aiCoachEnabled;
  return (
    <Card>
      <SectionTitle right={<Sparkles size={16} className="text-[var(--text-faint)]" />}>{t("AI coach")}</SectionTitle>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{t("Enable AI coach")}</div>
          <div className="text-xs text-[var(--text-muted)]">
            {t("A chat that interprets your data. Only derived summaries are sent — never your journal, health notes or finance amounts.")}
          </div>
        </div>
        <Toggle checked={on} onChange={(v) => updateSettings({ aiCoachEnabled: v })} />
      </div>
      {on && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">{t("Let the coach read my journal")}</div>
            <div className="text-xs text-[var(--text-muted)]">
              {t("Shares recent entries (text, mood, tags) so the coach can reflect on them. Off = only mood/tag summaries.")}
            </div>
          </div>
          <Toggle checked={!!data.settings.aiJournalAccess} onChange={(v) => updateSettings({ aiJournalAccess: v })} />
        </div>
      )}
      <p className="mt-3 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-muted)]">
        {t("Needs a free Groq API key set as GROQ_API_KEY in your Vercel project. The key stays on the server and is never exposed in the app.")}
      </p>
    </Card>
  );
}

function DayFlowCard() {
  const { data, updateSettings } = useStore();
  const t = useT();
  const df = data.settings.dayFlow ?? {
    eveningEnabled: false,
    eveningFrom: "20:00",
    eveningTo: "03:00",
    morningEnabled: false,
    morningFrom: "04:00",
    morningTo: "11:00",
  };
  const set = (patch: Partial<typeof df>) => updateSettings({ dayFlow: { ...df, ...patch } });

  return (
    <Card>
      <SectionTitle>{t("Daily routines")}</SectionTitle>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        {t("Short guided screens that pop up once a day to help you log quickly. They never remove anything you already entered.")}
      </p>

      <div className="space-y-4">
        {/* Evening */}
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t("End-of-day wrap-up")}</div>
              <div className="text-xs text-[var(--text-muted)]">{t("Goals, check-in, day recap & journal.")}</div>
            </div>
            <Toggle checked={df.eveningEnabled} onChange={(v) => set({ eveningEnabled: v })} />
          </div>
          {df.eveningEnabled && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label={t("From")}>
                <input type="time" className={inputCls} value={df.eveningFrom} onChange={(e) => set({ eveningFrom: e.target.value })} />
              </Field>
              <Field label={t("Until")}>
                <input type="time" className={inputCls} value={df.eveningTo} onChange={(e) => set({ eveningTo: e.target.value })} />
              </Field>
            </div>
          )}
        </div>

        {/* Morning */}
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t("Good-morning sleep prompt")}</div>
              <div className="text-xs text-[var(--text-muted)]">{t("Just logs last night's sleep.")}</div>
            </div>
            <Toggle checked={df.morningEnabled} onChange={(v) => set({ morningEnabled: v })} />
          </div>
          {df.morningEnabled && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label={t("From")}>
                <input type="time" className={inputCls} value={df.morningFrom} onChange={(e) => set({ morningFrom: e.target.value })} />
              </Field>
              <Field label={t("Until")}>
                <input type="time" className={inputCls} value={df.morningTo} onChange={(e) => set({ morningTo: e.target.value })} />
              </Field>
            </div>
          )}
        </div>

        {/* Weekly / monthly recap */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
          <div>
            <div className="text-sm font-medium">{t("Weekly & monthly recap")}</div>
            <div className="text-xs text-[var(--text-muted)]">{t("An animated summary on Sundays and the 1st.")}</div>
          </div>
          <Toggle checked={df.recapsEnabled ?? true} onChange={(v) => set({ recapsEnabled: v })} />
        </div>
      </div>
    </Card>
  );
}

function StreakCard() {
  const { data, updateSettings } = useStore();
  const t = useT();
  const rest = [...(data.settings.restDays ?? [])].sort();
  const grace = data.settings.streakGrace ?? 0;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function addRange() {
    if (!from) return;
    const end = to && to >= from ? to : from;
    const set = new Set(rest);
    for (let d = from; d <= end; d = addDays(d, 1)) set.add(d);
    updateSettings({ restDays: [...set].sort() });
    setFrom("");
    setTo("");
  }
  function removeDay(d: string) {
    updateSettings({ restDays: rest.filter((x) => x !== d) });
  }

  const vacations = [...(data.settings.vacations ?? [])].sort((a, b) => (a.from < b.from ? -1 : 1));
  const [vfrom, setVfrom] = useState("");
  const [vto, setVto] = useState("");
  function addVacation() {
    if (!vfrom) return;
    const end = vto && vto >= vfrom ? vto : vfrom;
    updateSettings({ vacations: [...vacations, { from: vfrom, to: end }] });
    setVfrom("");
    setVto("");
  }
  function removeVacation(idx: number) {
    updateSettings({ vacations: vacations.filter((_, i) => i !== idx) });
  }

  return (
    <Card>
      <SectionTitle>{t("Streak protection")}</SectionTitle>
      <p className="mb-3 text-sm text-[var(--text-muted)]">
        {t("Rest days and a grace window keep a good streak alive when you take a break or forget to log.")}
      </p>

      <Field label={`${t("Grace days")}: ${grace}`} hint={t("Missed days a streak tolerates before it breaks.")}>
        <input
          type="range"
          min={0}
          max={5}
          value={grace}
          onChange={(e) => updateSettings({ streakGrace: Number(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
      </Field>

      <div className="mt-4">
        <div className="mb-1.5 text-sm font-medium">{t("Rest days (e.g. vacation)")}</div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t("From")}>
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t("Until (optional)")}>
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Button variant="soft" size="sm" onClick={addRange} disabled={!from}>
            {t("Add")}
          </Button>
        </div>
        {rest.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {rest.map((d) => (
              <button
                key={d}
                onClick={() => removeDay(d)}
                className="flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
              >
                {fmtShort(d)} <span className="text-[var(--text-faint)]">✕</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-[var(--border)] pt-4">
        <div className="mb-1 text-sm font-medium">{t("Vacation")}</div>
        <p className="mb-2 text-xs text-[var(--text-muted)]">
          {t("On vacation days scoring is lenient — missed habits and slips don't count, and your Life Rating can't drop. Streaks stay safe too.")}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t("From")}>
            <input type="date" className={inputCls} value={vfrom} onChange={(e) => setVfrom(e.target.value)} />
          </Field>
          <Field label={t("Until (optional)")}>
            <input type="date" className={inputCls} value={vto} onChange={(e) => setVto(e.target.value)} />
          </Field>
          <Button variant="soft" size="sm" onClick={addVacation} disabled={!vfrom}>
            {t("Add")}
          </Button>
        </div>
        {vacations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {vacations.map((v, i) => (
              <button
                key={`${v.from}-${v.to}-${i}`}
                onClick={() => removeVacation(i)}
                className="flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs text-[var(--accent)] hover:brightness-105"
              >
                {fmtShort(v.from)}{v.to !== v.from ? ` – ${fmtShort(v.to)}` : ""} <span className="opacity-70">✕</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function HealthImportCard() {
  const { data, replaceAll } = useStore();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File) {
    setErr(null);
    setResult(null);
    if (file.name.toLowerCase().endsWith(".zip")) {
      setErr(t("Please unzip the export first and upload export.xml."));
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      if (!text.includes("HealthData") && !text.includes("<Record")) {
        setErr(t("That doesn't look like an Apple Health export.xml."));
        return;
      }
      const { parseAppleHealth } = await import("@/lib/appleHealth");
      const { next, summary } = parseAppleHealth(text, data);
      replaceAll(next);
      setResult(
        t("Imported {sleep} nights, {weight} weigh-ins, {workouts} workouts ({skipped} already present).", {
          sleep: summary.sleep,
          weight: summary.weight,
          workouts: summary.workouts,
          skipped: summary.skipped,
        }),
      );
    } catch {
      setErr(t("Could not read that file. On very large exports, try again on a computer."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle right={<HeartPulse size={16} className="text-[var(--text-faint)]" />}>
        {t("Apple Health import")}
      </SectionTitle>
      <p className="mb-2 text-sm text-[var(--text-muted)]">
        {t("Bring in sleep, weight and workouts from Apple Health. On your iPhone: Health app → your photo → “Export All Health Data”, unzip it, then upload the export.xml here.")}
      </p>
      <p className="mb-3 text-xs text-[var(--text-faint)]">
        {t("Everything is parsed on your device. Existing days are never overwritten. (Apple has no live web sync — this is a manual import.)")}
      </p>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-2)]">
        <Upload size={16} /> {busy ? t("Importing…") : t("Choose export.xml")}
        <input
          type="file"
          accept=".xml,text/xml,application/xml"
          className="hidden"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
      {result && <p className="mt-3 text-sm text-[var(--good)]">{result}</p>}
      {err && <p className="mt-3 text-sm text-[var(--bad)]">{err}</p>}
    </Card>
  );
}

function StravaCard() {
  const { data, replaceAll } = useStore();
  const t = useT();
  const [state, setState] = useState<StravaState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load stored tokens + finish the OAuth redirect (if we came back with ?code=).
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const oauthError = params.get("error");
    const existing = loadStrava();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(existing);
    setLoaded(true);

    if (oauthError) {
      window.history.replaceState({}, "", "/settings");
      setErr(t("Strava connection was cancelled."));
      return;
    }
    if (code && !existing) {
      setBusy(true);
      exchangeCode(code)
        .then(async (s) => {
          if (cancelled) return;
          window.history.replaceState({}, "", "/settings");
          const res = await syncStrava(s, data);
          if (cancelled) return;
          replaceAll(res.next);
          setState(res.state);
          setMsg(t("Connected. Imported {n} activities.", { n: res.imported }));
        })
        .catch((e) => !cancelled && setErr(String(e instanceof Error ? e.message : e)))
        .finally(() => !cancelled && setBusy(false));
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isStravaConfigured || !loaded) return null;

  async function sync() {
    if (!state) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await syncStrava(state, data);
      replaceAll(res.next);
      setState(res.state);
      setMsg(t("Synced. {n} new activities ({skipped} already imported).", { n: res.imported, skipped: res.skipped }));
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    saveStrava(null);
    setState(null);
    setMsg(null);
    setErr(null);
  }

  const name = state?.athlete
    ? [state.athlete.firstname, state.athlete.lastname].filter(Boolean).join(" ")
    : null;

  return (
    <Card>
      <SectionTitle right={<Activity size={16} className="text-[var(--text-faint)]" />}>Strava</SectionTitle>
      {state ? (
        <div className="space-y-3">
          <p className="text-sm">
            {t("Connected")}
            {name ? (
              <>
                {" · "}
                <span className="font-semibold">{name}</span>
              </>
            ) : null}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {state.lastSync
              ? `${t("Last activity synced")}: ${new Date(state.lastSync * 1000).toLocaleDateString()}`
              : t("Your Strava activities show up as workouts.")}
          </p>
          <div className="flex gap-2">
            <Button variant="soft" size="sm" onClick={sync} disabled={busy}>
              <RefreshCw size={15} /> {busy ? t("Syncing…") : t("Sync now")}
            </Button>
            <Button variant="outline" size="sm" onClick={disconnect} disabled={busy}>
              {t("Disconnect")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-muted)]">
            {t("Connect Strava to import your runs, rides and workouts automatically.")}
          </p>
          <Button size="sm" onClick={() => (window.location.href = authorizeUrl())} disabled={busy}>
            <Activity size={15} /> {t("Connect Strava")}
          </Button>
        </div>
      )}
      {msg && <p className="mt-3 text-sm text-[var(--good)]">{msg}</p>}
      {err && <p className="mt-3 text-sm text-[var(--bad)]">{err}</p>}
    </Card>
  );
}

const FEEDBACK_EMAIL = "heypana1@gmail.com";

function FeedbackCard() {
  const t = useT();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"bug" | "idea">("idea");

  function send() {
    const subjectTag = kind === "bug" ? "Bug" : "Feedback";
    const subject = `Life Dashboard — ${subjectTag}`;
    const body = `${text}\n\n—\n${t("Sent from Life Dashboard")}`;
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <Card>
      <SectionTitle>{t("Bugs & feedback")}</SectionTitle>
      <p className="mb-3 text-sm text-[var(--text-muted)]">
        {t("Hit a bug or have an idea? Send it straight to the developer — this opens your email app.")}
      </p>
      <div className="mb-3 flex gap-2">
        {(["idea", "bug"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              kind === k ? "grad text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]",
            )}
          >
            {k === "idea" ? t("Idea / feedback") : t("Bug report")}
          </button>
        ))}
      </div>
      <textarea
        className={inputCls}
        rows={4}
        placeholder={kind === "bug" ? t("What happened? What did you expect?") : t("What would make this better?")}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={send} disabled={!text.trim()}>
          <Send size={16} /> {t("Send email")}
        </Button>
        <span className="text-xs text-[var(--text-faint)]">{FEEDBACK_EMAIL}</span>
      </div>
    </Card>
  );
}

/** Number of whole days since an ISO timestamp. */
export function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  return Math.floor((Date.now() - then) / 86400000);
}

function backupAgeLabel(iso: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  const d = daysSince(iso);
  if (d <= 0) return t("today");
  if (d === 1) return t("1 day ago");
  return t("{n} days ago", { n: d });
}

function AccountCard() {
  const { sync } = useStore();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!sync.configured) return null;

  async function submit() {
    setBusy(true);
    setErr(null);
    const res = mode === "in" ? await sync.signIn(email, password) : await sync.signUp(email, password);
    setBusy(false);
    if (res.error) setErr(res.error === "already_registered" ? t("This email is already registered — sign in instead.") : res.error);
    else if (mode === "up") setErr(t("Account created — you can sign in now."));
  }

  return (
    <Card>
      <SectionTitle right={<RefreshCw size={16} className="text-[var(--text-faint)]" />}>
        {t("Account & sync")}
      </SectionTitle>

      {sync.email ? (
        <div className="space-y-3">
          <p className="text-sm">
            {t("Signed in as")} <span className="font-semibold">{sync.email}</span>
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {sync.status === "syncing"
              ? t("Syncing…")
              : sync.status === "error"
                ? `${t("Sync error")}: ${sync.error ?? ""}`
                : sync.lastSyncedAt
                  ? `${t("Synced")} · ${new Date(sync.lastSyncedAt).toLocaleTimeString()}`
                  : t("Same data on all your devices.")}
          </p>
          <div className="flex gap-2">
            <Button variant="soft" size="sm" onClick={() => sync.syncNow()}>
              <RefreshCw size={15} /> {t("Sync now")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => sync.signOut()}>
              {t("Sign out")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-muted)]">
            {t("Sign in to keep the same data on your phone and PC.")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={inputCls}
              type="email"
              placeholder={t("Email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className={inputCls}
              type="password"
              placeholder={t("Password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err && <p className="text-xs text-[var(--bad)]">{err}</p>}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={submit} disabled={busy || !email || !password}>
              {mode === "in" ? t("Sign in") : t("Create account")}
            </Button>
            <button
              onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(null); }}
              className="text-xs font-medium text-[var(--accent)]"
            >
              {mode === "in" ? t("Create account") : t("Have an account? Sign in")}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function RemindersCard() {
  const { data, updateSettings } = useStore();
  const t = useT();
  const r = data.settings.reminders;
  const lang = data.settings.language;
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErr, setPushErr] = useState<PushError | null>(null);

  async function enable() {
    if (perm === "unsupported") return;
    const res = await Notification.requestPermission();
    setPerm(res);
    if (res === "granted") {
      updateSettings({ reminders: { ...r, enabled: true } });
    }
  }

  const checkinTime = r.checkinTime ?? "21:00";
  // Freshly computed weekly-recap text stored server-side for the Sunday-evening push.
  const recap = () => weeklyRecapText(data, lang);

  async function togglePush(on: boolean) {
    setPushErr(null);
    if (!on) {
      updateSettings({ reminders: { ...r, push: false } });
      await disablePush();
      return;
    }
    setPushBusy(true);
    const weekly = r.weeklyRecap ?? true;
    const res = await enablePush(checkinTime, r.habitReminders, lang, weekly, recap());
    setPushBusy(false);
    if (res.ok) updateSettings({ reminders: { ...r, enabled: true, push: true, weeklyRecap: weekly } });
    else setPushErr(res.error ?? "server");
  }

  // Keep the server's copy of the reminder time in sync while push is on.
  function updateTime(time: string) {
    updateSettings({ reminders: { ...r, checkinTime: time } });
    if (r.push) void syncPush(time, r.habitReminders, lang, !!r.weeklyRecap, recap());
  }

  function toggleWeekly(v: boolean) {
    updateSettings({ reminders: { ...r, weeklyRecap: v } });
    if (r.push) void syncPush(checkinTime, r.habitReminders, lang, v, recap());
  }

  const PUSH_ERR: Record<PushError, string> = {
    unsupported: t("Push isn't supported on this device/browser."),
    not_configured: t("Push isn't set up on the server yet."),
    denied: t("Notifications are blocked — allow them in your browser settings."),
    server: t("Couldn't reach the server. Try again."),
  };

  return (
    <Card>
      <SectionTitle>{t("Reminders")}</SectionTitle>
      <p className="mb-3 text-sm text-[var(--text-muted)]">
        {t("A daily nudge to log your day.")}
      </p>

      {perm === "unsupported" ? (
        <p className="text-sm text-[var(--text-faint)]">{t("Notifications aren't supported here.")}</p>
      ) : perm !== "granted" ? (
        <Button variant="soft" onClick={enable}>
          <BellRing size={16} /> {t("Enable notifications")}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
            <span className="text-sm font-medium">{t("Daily check-in reminder")}</span>
            <Toggle
              checked={r.enabled}
              onChange={(v) => updateSettings({ reminders: { ...r, enabled: v } })}
            />
          </div>
          {r.enabled && (
            <>
              <Field label={t("Reminder time")}>
                <input
                  type="time"
                  className={inputCls}
                  value={checkinTime}
                  onChange={(e) => updateTime(e.target.value)}
                />
                {(() => {
                  const hour = typicalLogHour(data.habitLogs);
                  const suggested = hour == null ? null : `${String(hour).padStart(2, "0")}:00`;
                  if (!suggested || suggested === checkinTime) return null;
                  return (
                    <button
                      onClick={() => updateTime(suggested)}
                      className="mt-1.5 text-xs text-[var(--accent)] hover:underline"
                    >
                      {t("You usually log around {time} — use that?", { time: suggested })}
                    </button>
                  );
                })()}
              </Field>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
                <span className="text-sm font-medium">{t("Include still-open habits")}</span>
                <Toggle
                  checked={r.habitReminders}
                  onChange={(v) => {
                    updateSettings({ reminders: { ...r, habitReminders: v } });
                    if (r.push) void syncPush(checkinTime, v, lang, !!r.weeklyRecap, recap());
                  }}
                />
              </div>

              {pushConfigured && (
                <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{t("Also when the app is closed (push)")}</div>
                      <div className="text-xs text-[var(--text-muted)]">{t("Get the reminder as a real notification even when the app isn't open.")}</div>
                    </div>
                    <Toggle checked={!!r.push && !pushBusy} onChange={togglePush} />
                  </div>
                  {pushErr && <p className="mt-2 text-xs text-[var(--bad)]">{PUSH_ERR[pushErr]}</p>}
                  {r.push && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{t("Weekly recap (Sun evening)")}</div>
                        <div className="text-xs text-[var(--text-muted)]">{t("Your Life-Score trend + the week's key insight.")}</div>
                      </div>
                      <Toggle checked={!!r.weeklyRecap} onChange={toggleWeekly} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}

const SEXES: NonNullable<Profile["sex"]>[] = ["male", "female", "other", "prefer_not"];
const ACTIVITY: NonNullable<Profile["activityLevel"]>[] = ["sedentary", "light", "moderate", "active", "athlete"];

function AccentCard() {
  const { data, updateSettings } = useStore();
  const d = useDerived();
  const t = useT();
  const level = computeLevel(data, d.history).level;
  const owned = data.rewards.owned ?? [];
  const current = data.settings.accent ?? "calm";
  const available = ACCENT_REWARDS.filter((r) => accentOwned(r.accent, level, owned));
  const lockedCount = ACCENT_REWARDS.length - available.length;
  return (
    <Card>
      <SectionTitle
        right={
          lockedCount > 0 ? (
            <Link href="/rewards" className="text-xs font-medium text-[var(--accent)] hover:underline">
              +{lockedCount} {t("in the shop")}
            </Link>
          ) : undefined
        }
      >
        {t("Accent")}
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {available.map((r) => (
          <button
            key={r.accent}
            onClick={() => updateSettings({ accent: r.accent })}
            className={clsx(
              "flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-sm font-medium transition",
              current === r.accent
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface-2)]",
            )}
          >
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: ACCENT_SWATCH[r.accent] }} />
            <span className="truncate">{t(r.name)}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function ProfileCard() {
  const { data, updateProfile, saveWeight } = useStore();
  const t = useT();
  const p = data.settings.profile;
  const [weightInput, setWeightInput] = useState("");

  const latestWeight = data.weight.length ? data.weight[data.weight.length - 1].kg : undefined;
  const age = p.birthDate ? ageFrom(p.birthDate) : undefined;
  const bmi = p.heightCm && latestWeight ? latestWeight / (p.heightCm / 100) ** 2 : undefined;

  const weightChart = data.weight.map((w) => ({ date: w.date, value: w.kg }));

  return (
    <Card>
      <SectionTitle right={<User size={16} className="text-[var(--text-faint)]" />}>{t("Profile")}</SectionTitle>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        {t("Used to personalize the app and enrich your stats. Optional and private.")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Name")}>
          <input className={inputCls} value={p.name ?? ""} onChange={(e) => updateProfile({ name: e.target.value })} />
        </Field>
        <Field label={t("Age")}>
          <input
            type="number"
            inputMode="numeric"
            min={5}
            max={120}
            placeholder={t("years")}
            className={inputCls}
            value={age ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              updateProfile({ birthDate: v ? `${new Date().getFullYear() - Number(v)}-01-01` : undefined });
            }}
          />
        </Field>
        <Field label={t("Sex")}>
          <select className={inputCls} value={p.sex ?? "prefer_not"} onChange={(e) => updateProfile({ sex: e.target.value as Profile["sex"] })}>
            {SEXES.map((x) => (
              <option key={x} value={x}>{t(x)}</option>
            ))}
          </select>
        </Field>
        <Field label={t("Height (cm)")}>
          <input
            type="number"
            className={inputCls}
            value={p.heightCm ?? ""}
            onChange={(e) => updateProfile({ heightCm: e.target.value ? Number(e.target.value) : undefined })}
          />
        </Field>
        <Field label={t("Activity level")}>
          <select className={inputCls} value={p.activityLevel ?? "moderate"} onChange={(e) => updateProfile({ activityLevel: e.target.value as Profile["activityLevel"] })}>
            {ACTIVITY.map((x) => (
              <option key={x} value={x}>{t(x)}</option>
            ))}
          </select>
        </Field>
        <Field label={t("Current weight (kg)")}>
          <div className="flex gap-2">
            <input
              type="number"
              className={inputCls}
              placeholder={latestWeight ? String(latestWeight) : ""}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
            />
            <Button
              variant="soft"
              onClick={() => {
                if (weightInput) {
                  saveWeight({ date: todayISO(), kg: Number(weightInput) });
                  setWeightInput("");
                }
              }}
            >
              {t("Log weight")}
            </Button>
          </div>
        </Field>
      </div>

      {(age !== undefined || bmi !== undefined) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {age !== undefined && <Badge tone="accent">{age} {t("years")}</Badge>}
          {bmi !== undefined && <Badge tone="accent">{t("BMI")} {bmi.toFixed(1)}</Badge>}
          {latestWeight !== undefined && <Badge>{latestWeight} kg · {fmtShort(data.weight[data.weight.length - 1].date)}</Badge>}
        </div>
      )}

      {weightChart.length >= 2 && (
        <div className="mt-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{t("Weight trend")}</div>
          <TrendLine data={weightChart} color="var(--accent)" name={t("Current weight (kg)")} height={160} unit=" kg" />
        </div>
      )}
    </Card>
  );
}
