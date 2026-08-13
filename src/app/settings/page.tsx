"use client";

import { useState } from "react";
import { BellRing, Download, Monitor, Moon, RefreshCw, RotateCcw, Send, Sun, Trash2, Upload, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { Accent, AreaKey, Language, Profile } from "@/lib/types";

const ACCENTS: { key: Accent; label: string; a: string; b: string }[] = [
  { key: "calm", label: "Calm", a: "#4f46e5", b: "#6366f1" },
  { key: "aurora", label: "Aurora", a: "#06b6d4", b: "#4f46e5" },
  { key: "mono", label: "Mono", a: "#52525b", b: "#27272a" },
];
import { generateDemo, clearDemo } from "@/lib/demo";
import { useT } from "@/lib/i18n";
import { todayISO, fmtShort, ageFrom } from "@/lib/date";
import { Card, PageHeader, SectionTitle, Button, Toggle, Badge, Field, inputCls } from "@/components/ui";
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
      <PageHeader title={t("Settings")} subtitle={t("Tune what you track and how your score is computed.")} />

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
      </Card>

      {/* Accent */}
      <Card>
        <SectionTitle>{t("Accent")}</SectionTitle>
        <div className="flex gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              onClick={() => updateSettings({ accent: a.key })}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition",
                s.accent === a.key
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-2)]",
              )}
            >
              <span
                className="h-4 w-4 rounded-full"
                style={{ background: `linear-gradient(135deg, ${a.a}, ${a.b})` }}
              />
              {t(a.label)}
            </button>
          ))}
        </div>
      </Card>

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
      <RemindersCard />

      {/* Guided day-flow overlays */}
      <DayFlowCard />

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

      <p className="pb-4 text-center text-xs text-[var(--text-faint)]">
        {t("Life Dashboard · your data lives in this browser only.")}
      </p>
    </div>
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
      </div>
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
    if (res.error) setErr(res.error);
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
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );

  async function enable() {
    if (perm === "unsupported") return;
    const res = await Notification.requestPermission();
    setPerm(res);
    if (res === "granted") {
      updateSettings({ reminders: { ...r, enabled: true } });
    }
  }

  return (
    <Card>
      <SectionTitle>{t("Reminders")}</SectionTitle>
      <p className="mb-3 text-sm text-[var(--text-muted)]">
        {t("A daily nudge to log your day. Works only while the app is open (no background push).")}
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
                  value={r.checkinTime ?? "21:00"}
                  onChange={(e) =>
                    updateSettings({ reminders: { ...r, checkinTime: e.target.value } })
                  }
                />
              </Field>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
                <span className="text-sm font-medium">{t("Include still-open habits")}</span>
                <Toggle
                  checked={r.habitReminders}
                  onChange={(v) => updateSettings({ reminders: { ...r, habitReminders: v } })}
                />
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

const SEXES: NonNullable<Profile["sex"]>[] = ["male", "female", "other", "prefer_not"];
const ACTIVITY: NonNullable<Profile["activityLevel"]>[] = ["sedentary", "light", "moderate", "active", "athlete"];

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
