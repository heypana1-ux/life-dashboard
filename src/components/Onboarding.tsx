"use client";

import { useState } from "react";
import { Moon, Sparkles, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { AREA_LABELS, DEFAULT_AREAS, starterHabits } from "@/lib/defaults";
import { ABOUT_GROUPS, AboutQuestion } from "@/lib/about";
import { generateDemo } from "@/lib/demo";
import { AppData, AreaKey, Language, Profile } from "@/lib/types";
import { todayISO } from "@/lib/date";
import { useT } from "@/lib/i18n";
import { ConsentGate } from "@/components/ConsentGate";
import { Button, Card, Field, inputCls } from "@/components/ui";
import clsx from "clsx";

const AREA_DESC_KEYS: Record<AreaKey, string> = {
  productivity: "Focus & deep work",
  sport: "Training & movement",
  sleep: "Rest & recovery",
  habits: "Build & reduce behaviors",
  learning: "Study & skills",
  creativity: "Projects & making",
  reflection: "Daily check-ins & mood",
  finances: "Net worth & spending",
  health: "Wellbeing & symptoms",
};

const SELECTABLE: AreaKey[] = [
  "sport",
  "sleep",
  "learning",
  "creativity",
  "reflection",
  "habits",
  "productivity",
  "finances",
  "health",
];

export function Onboarding() {
  const { data, replaceAll, updateSettings, sync } = useStore();
  const t = useT();
  const lang = data.settings.language;
  const [step, setStep] = useState(0);
  // Art. 9 consent comes first, before any screen that invites you to enter health data.
  // Recorded in settings, so returning users never see it again and it can be withdrawn later.
  const [consented, setConsented] = useState(!!data.settings.consent?.health);
  const [demoChoice, setDemoChoice] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<Set<AreaKey>>(
    new Set(["sport", "sleep", "habits", "reflection", "productivity"]),
  );
  const [sleepH, setSleepH] = useState(8);
  const [trainPerWeek, setTrainPerWeek] = useState(3);
  const [about, setAbout] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<{
    name: string;
    age: string;
    sex: NonNullable<Profile["sex"]>;
    heightCm: string;
    weightKg: string;
  }>({ name: "", age: "", sex: "prefer_not", heightCm: "", weightKg: "" });

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
    const prof: Profile = { ...data.settings.profile };
    if (profile.name.trim()) prof.name = profile.name.trim();
    if (profile.age) prof.birthDate = `${new Date().getFullYear() - Number(profile.age)}-01-01`;
    if (profile.sex !== "prefer_not") prof.sex = profile.sex;
    if (profile.heightCm) prof.heightCm = Number(profile.heightCm);

    // redistribute weight of disabled areas is handled at scoring time; keep base weights.
    const answered = Object.fromEntries(Object.entries(about).filter(([, v]) => v.trim()));
    let next: AppData = {
      ...data,
      settings: {
        ...data.settings,
        areas,
        profile: prof,
        sleepTargetMinutes: Math.round(sleepH * 60),
        about: Object.keys(answered).length ? answered : data.settings.about,
        onboardingComplete: true,
      },
    };
    if (profile.weightKg) {
      next = { ...next, weight: [{ date: todayISO(), kg: Number(profile.weightKg) }] };
    }

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

  // From the data step: collect the optional "About you" answers, then (optionally) the
  // account step, before finishing.
  function chooseData(withDemo: boolean) {
    setDemoChoice(withDemo);
    setStep(5); // About-you questionnaire (skippable)
  }

  // After the questionnaire: account step if sync is available, else finish.
  function afterAbout() {
    if (sync.configured) setStep(4);
    else finish(demoChoice ?? false);
  }

  if (!consented) return <ConsentGate onDone={() => setConsented(true)} />;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
            <Sparkles size={20} />
          </div>
          <span className="text-lg font-semibold">Life Dashboard</span>
        </div>
        <div className="flex gap-1">
          {(["en", "de"] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => updateSettings({ language: l })}
              className={clsx(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                lang === l ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)]",
              )}
            >
              {l === "en" ? "EN" : "DE"}
            </button>
          ))}
        </div>
      </div>

      {step === 0 && (
        <Card className="animate-in">
          <h1 className="text-2xl font-semibold tracking-tight">{t("Which areas matter to you?")}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {t("Pick what you want to track. You can change any of this later — turning an area off keeps your dashboard focused.")}
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
                    <span className="block text-sm font-medium">{t(AREA_LABELS[k])}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{t(AREA_DESC_KEYS[k])}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setStep(1)} disabled={selected.size === 0}>
              {t("Continue")}
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="animate-in">
          <h1 className="text-2xl font-semibold tracking-tight">{t("About you")}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {t("Optional and private — used to personalize the app and your stats.")}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Field label={t("Name")}>
              <input
                className={inputCls}
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <Field label={t("Age")}>
              <input
                type="number"
                inputMode="numeric"
                min={5}
                max={120}
                placeholder={t("years")}
                className={inputCls}
                value={profile.age}
                onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))}
              />
            </Field>
            <Field label={t("Sex")}>
              <select
                className={inputCls}
                value={profile.sex}
                onChange={(e) => setProfile((p) => ({ ...p, sex: e.target.value as NonNullable<Profile["sex"]> }))}
              >
                {(["prefer_not", "male", "female", "other"] as const).map((x) => (
                  <option key={x} value={x}>{t(x)}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t("Height (cm)")}>
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputCls}
                  value={profile.heightCm}
                  onChange={(e) => setProfile((p) => ({ ...p, heightCm: e.target.value }))}
                />
              </Field>
              <Field label={t("Weight (kg)")}>
                <input
                  type="number"
                  inputMode="decimal"
                  className={inputCls}
                  value={profile.weightKg}
                  onChange={(e) => setProfile((p) => ({ ...p, weightKg: e.target.value }))}
                />
              </Field>
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              {t("Back")}
            </Button>
            <Button onClick={() => setStep(2)}>{t("Continue")}</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="animate-in">
          <h1 className="text-2xl font-semibold tracking-tight">{t("A few targets")}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {t("These seed your goals. Nothing here is a medical recommendation — just your own targets to measure against.")}
          </p>
          <div className="mt-5 space-y-5">
            <Field label={`${t("Sleep target")}: ${sleepH}h`}>
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
              <Field label={`${t("Training")}: ${trainPerWeek}× / ${t("week")}`}>
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
            <Button variant="ghost" onClick={() => setStep(1)}>
              {t("Back")}
            </Button>
            <Button onClick={() => setStep(3)}>{t("Continue")}</Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="animate-in">
          <h1 className="text-2xl font-semibold tracking-tight">{t("Start with data?")}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {t("Load 45 days of realistic demo data to explore charts, ELO and insights right away — or start clean with a few starter habits. Demo data can be cleared any time in Settings.")}
          </p>
          <div className="mt-5 grid gap-3">
            <button
              onClick={() => chooseData(true)}
              className="flex items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4 text-left"
            >
              <Moon className="text-[var(--accent)]" size={20} />
              <span>
                <span className="block font-medium">{t("Explore with demo data")}</span>
                <span className="block text-xs text-[var(--text-muted)]">
                  {t("Recommended for a first look")}
                </span>
              </span>
            </button>
            <button
              onClick={() => chooseData(false)}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left hover:border-[var(--text-faint)]"
            >
              <Check className="text-[var(--text-muted)]" size={20} />
              <span>
                <span className="block font-medium">{t("Start clean")}</span>
                <span className="block text-xs text-[var(--text-muted)]">
                  {t("A handful of starter habits, no history")}
                </span>
              </span>
            </button>
          </div>
          <div className="mt-6">
            <Button variant="ghost" onClick={() => setStep(2)}>
              {t("Back")}
            </Button>
          </div>
        </Card>
      )}

      {step === 5 && (
        <Card className="animate-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{t("Tell your coach about you")}</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {t("Optional — answer what you like now, or do it later under 'About you'. It helps the AI coach give advice that fits you.")}
              </p>
            </div>
            <button onClick={afterAbout} className="shrink-0 whitespace-nowrap text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]">
              {t("Later")}
            </button>
          </div>

          <div className="mt-4 max-h-[52vh] space-y-4 overflow-y-auto pr-1">
            {ABOUT_GROUPS.map((g) => (
              <div key={g.group}>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">{t(g.group)}</div>
                <div className="space-y-3">
                  {g.questions.map((q) => (
                    <OnboardingAboutField
                      key={q.id}
                      q={q}
                      value={about[q.id] ?? ""}
                      onChange={(v) => setAbout((a) => ({ ...a, [q.id]: v }))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(3)}>{t("Back")}</Button>
            <Button onClick={afterAbout}>{t("Continue")}</Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <AccountStep
          onBack={() => setStep(5)}
          onSkip={() => finish(demoChoice ?? false)}
          onDone={() => finish(demoChoice ?? false)}
          sync={sync}
        />
      )}

      <p className="mt-6 text-center text-xs text-[var(--text-faint)]">
        {t("Everything is stored locally in your browser. Nothing is sent anywhere.")}
      </p>
    </div>
  );
}

function OnboardingAboutField({
  q,
  value,
  onChange,
}: {
  q: AboutQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  return (
    <div>
      <div className="mb-1 text-[13px] font-medium">{t(q.q)}</div>
      {q.options && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {q.options.map((opt) => {
            const active = value.trim() === t(opt);
            return (
              <button
                key={opt}
                onClick={() => onChange(active ? "" : t(opt))}
                className={clsx(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]",
                )}
              >
                {t(opt)}
              </button>
            );
          })}
        </div>
      )}
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={q.placeholder ? t(q.placeholder) : t("Your answer…")}
        className={`${inputCls} resize-none`}
      />
    </div>
  );
}

function AccountStep({
  onBack,
  onSkip,
  onDone,
  sync,
}: {
  onBack: () => void;
  onSkip: () => void;
  onDone: () => void;
  sync: ReturnType<typeof useStore>["sync"];
}) {
  const t = useT();
  const [mode, setMode] = useState<"up" | "in">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !password) return;
    setBusy(true);
    setErr(null);
    const res = mode === "in" ? await sync.signIn(email, password) : await sync.signUp(email, password);
    setBusy(false);
    if (res.error) {
      setErr(res.error === "already_registered" ? t("This email is already registered — sign in instead.") : res.error);
      return;
    }
    // Signing in pulls existing cloud data; creating pushes this device's data up.
    onDone();
  }

  return (
    <Card className="animate-in">
      <h1 className="text-2xl font-semibold tracking-tight">{t("Sync across your devices")}</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {t("Create an account to keep the same data on your phone and PC. Optional — you can also do this later in Settings.")}
      </p>

      <div className="mt-5 flex gap-1 rounded-xl bg-[var(--surface-2)] p-1">
        {(["up", "in"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setErr(null);
            }}
            className={clsx(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
              mode === m ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)]",
            )}
          >
            {m === "up" ? t("Create account") : t("Sign in")}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <Field label={t("Email")}>
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t("Password")}>
          <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {err && <p className="text-xs text-[var(--bad)]">{err}</p>}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          {t("Back")}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onSkip}>
            {t("Skip for now")}
          </Button>
          <Button onClick={submit} disabled={busy || !email || !password}>
            {mode === "up" ? t("Create account") : t("Sign in")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
