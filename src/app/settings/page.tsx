"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  BellRing,
  ChevronDown,
  ChevronRight,
  Download,
  HeartPulse,
  Monitor,
  Moon,
  RefreshCw,
  RotateCcw,
  Scale,
  ShieldCheck,
  Send,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { AreaKey, Language, Profile, Settings } from "@/lib/types";
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
import { CONSENT_VERSION } from "@/lib/legal";
import { PageHeader, Toggle, Badge, IconTile } from "@/components/ui";
import { InstallAppCard } from "@/components/PWA";
import { pushConfigured, enablePush, disablePush, syncPush, PushError } from "@/lib/push";
import { weeklyRecapText } from "@/lib/weeklyRecap";
import { typicalLogHour } from "@/lib/habitTimes";
import { TrendLine } from "@/components/charts";
import clsx from "clsx";

/* ============================ Pulse settings primitives ============================
   Settings cards in the design are a touch tighter than the app-wide card (22px radius,
   16/17px padding) and everything inside them is a hairline row instead of a nested box.
   These four helpers carry that language so each section below stays declarative.       */

/** Settings card: uppercase section label, optional icon on the right.
 *  `collapsible` turns the whole header into a disclosure button — used for sections whose
 *  controls you'd rather not brush past by accident (the life-area weight sliders). */
function SCard({
  title,
  icon,
  right,
  collapsible,
  summary,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  collapsible?: boolean;
  /** Shown next to the chevron while collapsed, so the card still says something. */
  summary?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const head = (
    <>
      <h2 className="slabel">{title}</h2>
      {collapsible ? (
        <span className="flex shrink-0 items-center gap-2 text-[var(--text-faint)]">
          {!open && summary && <span className="text-[11px]">{summary}</span>}
          <ChevronDown size={16} className={clsx("transition-transform", open && "rotate-180")} />
        </span>
      ) : (
        (right ?? (icon && <span className="text-[var(--text-faint)]">{icon}</span>))
      )}
    </>
  );

  return (
    <section className="card rounded-[22px] px-[17px] py-4">
      {collapsible ? (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={clsx("flex w-full items-center justify-between gap-2 text-left", open && "mb-3")}
        >
          {head}
        </button>
      ) : (
        <div className="mb-3 flex items-center justify-between gap-2">{head}</div>
      )}
      {(!collapsible || open) && children}
    </section>
  );
}

/** Hairline setting row: title, optional description, control on the right. */
function SRow({
  title,
  desc,
  children,
}: {
  title: React.ReactNode;
  desc?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--surface-2)] py-3 last:border-0">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{title}</div>
        {desc && <p className="mt-0.5 text-[11.5px] leading-[1.4] text-[var(--text-muted)]">{desc}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

/** Compact labelled field: 10.5px uppercase label over an 11px-radius input. */
function SField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // Full-height column with the control pushed to the bottom, so a label that wraps to two
    // lines (German loves those) doesn't push its input out of line with its neighbour's.
    <label className="flex h-full min-w-0 flex-col">
      <span className="block text-[10.5px] font-semibold uppercase leading-[1.3] tracking-[0.08em] text-[var(--text-faint)]">
        {label}
      </span>
      <div className="mt-auto pt-[5px]">{children}</div>
    </label>
  );
}

const sInput =
  "w-full rounded-[11px] border border-[var(--border)] bg-[var(--surface)] px-[11px] py-[9px] text-[12.5px] outline-none transition focus:border-[var(--area-a)]";

/** The design's in-card action pill (Log weight, Sync now, Export JSON …). */
const sBtn = {
  soft: "grad-soft area-text",
  outline: "border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--area-a)]",
  surface: "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--area-a)]",
  danger: "border border-[color-mix(in_srgb,var(--bad)_45%,transparent)] bg-[var(--surface-2)] text-[var(--bad)]",
  primary: "area-grad hover:opacity-90",
} as const;

function SBtn({
  tone = "soft",
  onClick,
  disabled,
  children,
}: {
  tone?: keyof typeof sBtn;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-[12px] px-[13px] py-[9px] text-[12px] font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50",
        sBtn[tone],
      )}
    >
      {children}
    </button>
  );
}

/** Same pill, but wrapping a hidden <input type="file"> (buttons can't open a file picker). */
function SFileBtn({
  accept,
  disabled,
  onFile,
  children,
}: {
  accept: string;
  disabled?: boolean;
  onFile: (f: File) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={clsx(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[12px] px-[13px] py-[9px] text-[12px] font-semibold transition",
        sBtn.surface,
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {children}
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </label>
  );
}

/** 6px gradient track with a white knob, as in the design's sleep-target / grace-day sliders. */
function PulseRange({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="pulse-range mt-2.5"
      style={{ "--fill": `${pct}%` } as React.CSSProperties}
    />
  );
}

/* ================================== The page ================================== */

export default function SettingsPage() {
  const { data, updateSettings, setAreas } = useStore();
  const t = useT();
  const s = data.settings;

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

  return (
    <div className="space-y-3">
      <PageHeader
        kicker={t("Tracking & scoring")}
        lead={t("Your")}
        title={t("Settings")}
        subtitle={t("Tune what you track and how your score is computed.")}
      />

      {/* Install as an app (PWA) */}
      <InstallAppCard />

      {/* Appearance — theme tiles, density and accent live in one card, as in the design. */}
      <SCard title={t("Appearance")}>
        <div className="flex gap-[7px]">
          {[
            { k: "light", label: t("Light"), icon: Sun },
            { k: "dark", label: t("Dark"), icon: Moon },
            { k: "system", label: t("System"), icon: Monitor },
          ].map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              onClick={() => updateSettings({ theme: k as typeof s.theme })}
              className={clsx(
                "flex flex-1 flex-col items-center gap-[5px] rounded-[14px] border py-[11px] text-[11.5px] font-semibold transition",
                s.theme === k
                  ? "grad-soft border-[color-mix(in_srgb,var(--area-a)_35%,transparent)] area-text"
                  : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]",
              )}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <div className="mt-3.5 text-[13px] font-medium">{t("Density")}</div>
        <div className="mt-[7px] flex gap-[7px]">
          {[
            { k: "cozy", label: t("Cozy") },
            { k: "compact", label: t("Compact") },
          ].map(({ k, label }) => (
            <button
              key={k}
              onClick={() => updateSettings({ density: k as "cozy" | "compact" })}
              className={clsx(
                "whitespace-nowrap rounded-full border px-[13px] py-1.5 text-[12.5px] font-semibold transition",
                (s.density ?? "cozy") === k
                  ? "grad-soft border-[color-mix(in_srgb,var(--area-a)_35%,transparent)] area-text"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <AccentRow />
      </SCard>

      {/* Language */}
      <SCard title={t("Language")}>
        <div className="flex gap-[7px]">
          {[
            { k: "en", label: t("English"), flag: "🇬🇧" },
            { k: "de", label: t("German"), flag: "🇩🇪" },
          ].map(({ k, label, flag }) => (
            <button
              key={k}
              onClick={() => updateSettings({ language: k as Language })}
              className={clsx(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-[13px] py-1.5 text-[12.5px] font-semibold transition",
                s.language === k
                  ? "grad-soft border-[color-mix(in_srgb,var(--area-a)_35%,transparent)] area-text"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]",
              )}
            >
              <span>{flag}</span> {label}
            </button>
          ))}
        </div>
      </SCard>

      {/* Life areas & weights — collapsed by default: the weight sliders sit right where you
          scroll, and a stray swipe used to reshuffle the percentages. */}
      <SCard
        title={t("Life areas")}
        collapsible
        summary={`${s.areas.filter((a) => a.enabled).length}/${s.areas.length} ${t("active")}`}
      >
        <p className="-mt-1 mb-2.5 text-[11.5px] text-[var(--text-muted)]">{t("normalized to 100%")}</p>
        <div className="flex flex-col">
          {s.areas.map((a) => (
            <div key={a.key} className="border-b border-[var(--surface-2)] py-[11px] last:border-0">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
                  <span className="truncate">{t(a.label)}</span>
                  {a.key === "finances" && <Badge>{t("manual only")}</Badge>}
                  {a.enabled && <Badge tone="accent">{normalizedPct(a.weight)}%</Badge>}
                </span>
                <Toggle checked={a.enabled} onChange={(v) => setAreaEnabled(a.key, v)} />
              </div>
              {a.enabled && a.key !== "finances" && (
                <PulseRange value={a.weight} min={0} max={30} onChange={(v) => setAreaWeight(a.key, v)} />
              )}
            </div>
          ))}
        </div>
      </SCard>

      {/* Sleep target */}
      <SCard title={t("Sleep target")}>
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="font-medium">
            {Math.round((s.sleepTargetMinutes / 60) * 10) / 10} {t("hours")}
          </span>
          <span className="num text-[var(--text-faint)]">{s.sleepTargetMinutes} min</span>
        </div>
        <PulseRange
          value={s.sleepTargetMinutes}
          min={300}
          max={600}
          step={15}
          onChange={(v) => updateSettings({ sleepTargetMinutes: v })}
        />
      </SCard>

      {/* AI coach */}
      <CoachCard />

      {/* Guided day-flow overlays */}
      <DayFlowCard />

      {/* Streak protection & rest days */}
      <StreakCard />

      {/* ── Second half of the design: profile, sync and data ── */}
      <div className="kicker pt-4">{t("Profile, sync & data")}</div>

      {/* Profile */}
      <ProfileCard />

      {/* Reminders */}
      <div id="reminders" className="scroll-mt-20">
        <RemindersCard />
      </div>

      {/* Integrations: Strava (when configured) + Apple Health import */}
      <IntegrationsCard />

      {/* Account & cloud sync (only when Supabase is configured) */}
      <AccountCard />

      {/* Data & backup */}
      <DataCard />

      {/* Privacy, consents and the legal pages */}
      <PrivacyCard />

      {/* Bugs & feedback */}
      <FeedbackCard />

      <div className="pt-1 text-center">
        <button
          onClick={() => updateSettings({ tourDone: false })}
          className="text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          {t("Show the tour again")}
        </button>
      </div>

      <p className="text-center text-[11px] text-[var(--text-faint)]">
        {t("Life Dashboard · your data lives in this browser only.")}
      </p>
      <p className="pb-4 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--area-text)]">
        Pulse Build 37
      </p>
    </div>
  );
}

/* The AI switch is also a consent (Art. 9(2)(a) — the summaries are derived from health data
   and go to a US provider), so flipping it has to record or clear that consent, wherever the
   switch happens to live. Both the coach card and the privacy card go through these. */
type Consent = NonNullable<Settings["consent"]>;

function nextAiConsent(c: Consent | undefined, on: boolean): Consent {
  const now = new Date().toISOString();
  return on
    ? { ...c, version: CONSENT_VERSION, ai: now }
    : { ...c, version: CONSENT_VERSION, ai: undefined, aiJournal: undefined };
}

function nextJournalConsent(c: Consent | undefined, on: boolean): Consent {
  return { ...c, version: CONSENT_VERSION, aiJournal: on ? new Date().toISOString() : undefined };
}

/** Consent management: what you agreed to, when — and one tap to take it back (Art. 7(3)). */
function PrivacyCard() {
  const { data, updateSettings } = useStore();
  const t = useT();
  const c = data.settings.consent;
  const lang = data.settings.language;
  const when = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString(lang === "de" ? "de-DE" : "en-US") : null;

  /* Withdrawing has to be as easy as consenting was, and it has to actually stop the
     processing — so pulling the AI consent switches the coach off in the same move. */
  const setAi = (on: boolean) =>
    updateSettings({ consent: nextAiConsent(c, on), aiCoachEnabled: on, ...(on ? {} : { aiJournalAccess: false }) });
  const setAiJournal = (on: boolean) =>
    updateSettings({ consent: nextJournalConsent(c, on), aiJournalAccess: on });

  return (
    <SCard title={t("Privacy & consent")} icon={<ShieldCheck size={16} />}>
      <SRow
        title={t("Health-related entries")}
        desc={
          c?.health
            ? `${t("Agreed on {d}", { d: when(c.health) ?? "" })} · ${t("Art. 9 GDPR")}`
            : t("Not yet agreed.")
        }
      >
        <Link href="/profile" className="area-text text-[11.5px] font-medium hover:underline">
          {t("Withdraw")}
        </Link>
      </SRow>

      <SRow
        title={t("AI coach")}
        desc={c?.ai ? t("Agreed on {d}", { d: when(c.ai) ?? "" }) : t("Sends summaries of your data to a provider in the USA.")}
      >
        <Toggle checked={!!c?.ai} onChange={setAi} />
      </SRow>

      {c?.ai && (
        <SRow
          title={t("Journal for the coach")}
          desc={c.aiJournal ? t("Agreed on {d}", { d: when(c.aiJournal) ?? "" }) : t("Off — only mood and tag summaries are sent.")}
        >
          <Toggle checked={!!c.aiJournal} onChange={setAiJournal} />
        </SRow>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--surface-2)] pt-3">
        <Link
          href="/legal/privacy"
          className={clsx("inline-flex items-center gap-1.5 rounded-[12px] px-[13px] py-[9px] text-[12px] font-semibold transition", sBtn.surface)}
        >
          <ShieldCheck size={14} /> {t("Privacy notice")}
        </Link>
        <Link
          href="/legal/imprint"
          className={clsx("inline-flex items-center gap-1.5 rounded-[12px] px-[13px] py-[9px] text-[12px] font-semibold transition", sBtn.surface)}
        >
          <Scale size={14} /> {t("Imprint")}
        </Link>
      </div>

      <p className="mt-2.5 text-[11px] leading-[1.45] text-[var(--text-faint)]">
        {t("Withdrawing a consent does not affect processing that already happened. To withdraw the health consent, delete your data under Profile.")}
      </p>
    </SCard>
  );
}

function CoachCard() {
  const { data, updateSettings } = useStore();
  const t = useT();
  const on = !!data.settings.aiCoachEnabled;
  return (
    <SCard title={t("AI coach")} icon={<Sparkles size={16} />}>
      <SRow
        title={t("Enable AI coach")}
        desc={t("A chat that interprets your data. Only derived summaries are sent — never your journal, health notes or finance amounts.")}
      >
        <Toggle
          checked={on}
          onChange={(v) =>
            updateSettings({
              consent: nextAiConsent(data.settings.consent, v),
              aiCoachEnabled: v,
              ...(v ? {} : { aiJournalAccess: false }),
            })
          }
        />
      </SRow>
      {on && (
        <SRow
          title={t("Let the coach read my journal")}
          desc={t("Shares recent entries (text, mood, tags) so the coach can reflect on them. Off = only mood/tag summaries.")}
        >
          <Toggle
            checked={!!data.settings.aiJournalAccess}
            onChange={(v) =>
              updateSettings({ consent: nextJournalConsent(data.settings.consent, v), aiJournalAccess: v })
            }
          />
        </SRow>
      )}
      <p className="mt-2.5 text-[11px] leading-[1.45] text-[var(--text-faint)]">
        {t("Needs a free Groq API key set as GROQ_API_KEY in your Vercel project. The key stays on the server and is never exposed in the app.")}
      </p>
    </SCard>
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
    <SCard title={t("Daily routines")}>
      <SRow title={t("End-of-day wrap-up")} desc={t("Goals, check-in, day recap & journal.")}>
        <Toggle checked={df.eveningEnabled} onChange={(v) => set({ eveningEnabled: v })} />
      </SRow>
      {df.eveningEnabled && (
        <div className="grid grid-cols-2 gap-[9px] border-b border-[var(--surface-2)] pb-3 pt-2.5">
          <SField label={t("From")}>
            <input type="time" className={`${sInput} num`} value={df.eveningFrom} onChange={(e) => set({ eveningFrom: e.target.value })} />
          </SField>
          <SField label={t("Until")}>
            <input type="time" className={`${sInput} num`} value={df.eveningTo} onChange={(e) => set({ eveningTo: e.target.value })} />
          </SField>
        </div>
      )}

      <SRow title={t("Good-morning sleep prompt")} desc={t("Just logs last night's sleep.")}>
        <Toggle checked={df.morningEnabled} onChange={(v) => set({ morningEnabled: v })} />
      </SRow>
      {df.morningEnabled && (
        <div className="grid grid-cols-2 gap-[9px] border-b border-[var(--surface-2)] pb-3 pt-2.5">
          <SField label={t("From")}>
            <input type="time" className={`${sInput} num`} value={df.morningFrom} onChange={(e) => set({ morningFrom: e.target.value })} />
          </SField>
          <SField label={t("Until")}>
            <input type="time" className={`${sInput} num`} value={df.morningTo} onChange={(e) => set({ morningTo: e.target.value })} />
          </SField>
        </div>
      )}

      <SRow title={t("Weekly & monthly recap")} desc={t("An animated summary on Sundays and the 1st.")}>
        <Toggle checked={df.recapsEnabled ?? true} onChange={(v) => set({ recapsEnabled: v })} />
      </SRow>

      <p className="mt-2.5 text-[11px] leading-[1.45] text-[var(--text-faint)]">
        {t("Short guided screens that pop up once a day to help you log quickly. They never remove anything you already entered.")}
      </p>
    </SCard>
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
    <SCard title={t("Streak protection")}>
      <div className="text-[13px] font-medium">
        {t("Grace days")}: {grace}
      </div>
      <p className="mt-0.5 text-[11.5px] leading-[1.4] text-[var(--text-muted)]">
        {t("Missed days a streak tolerates before it breaks.")}
      </p>
      <PulseRange value={grace} min={0} max={5} onChange={(v) => updateSettings({ streakGrace: v })} />

      <div className="mt-3.5 text-[13px] font-medium">{t("Rest days (e.g. vacation)")}</div>
      <div className="mt-[7px] grid grid-cols-2 gap-[9px]">
        <SField label={t("From")}>
          <input type="date" className={sInput} value={from} onChange={(e) => setFrom(e.target.value)} />
        </SField>
        <SField label={t("Until (optional)")}>
          <input type="date" className={sInput} value={to} onChange={(e) => setTo(e.target.value)} />
        </SField>
      </div>
      <div className="mt-2.5">
        <SBtn onClick={addRange} disabled={!from}>
          {t("Add")}
        </SBtn>
      </div>
      {rest.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {rest.map((d) => (
            <button
              key={d}
              onClick={() => removeDay(d)}
              className="flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
            >
              {fmtShort(d)} <span className="text-[var(--text-faint)]">✕</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-[var(--surface-2)] pt-3.5">
        <div className="text-[13px] font-medium">{t("Vacation")}</div>
        <p className="mt-0.5 text-[11.5px] leading-[1.4] text-[var(--text-muted)]">
          {t("On vacation days scoring is lenient — missed habits and slips don't count, and your Life Rating can't drop. Streaks stay safe too.")}
        </p>
        <div className="mt-[7px] grid grid-cols-2 gap-[9px]">
          <SField label={t("From")}>
            <input type="date" className={sInput} value={vfrom} onChange={(e) => setVfrom(e.target.value)} />
          </SField>
          <SField label={t("Until (optional)")}>
            <input type="date" className={sInput} value={vto} onChange={(e) => setVto(e.target.value)} />
          </SField>
        </div>
        <div className="mt-2.5">
          <SBtn onClick={addVacation} disabled={!vfrom}>
            {t("Add")}
          </SBtn>
        </div>
        {vacations.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {vacations.map((v, i) => (
              <button
                key={`${v.from}-${v.to}-${i}`}
                onClick={() => removeVacation(i)}
                className="area-soft flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] hover:brightness-105"
              >
                {fmtShort(v.from)}
                {v.to !== v.from ? ` – ${fmtShort(v.to)}` : ""} <span className="opacity-70">✕</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </SCard>
  );
}

/** Strava + Apple Health in one card, as the design groups them. */
function IntegrationsCard() {
  const t = useT();
  return (
    <SCard title={t("Integrations")}>
      <StravaTile />
      <AppleHealthTile />
    </SCard>
  );
}

function AppleHealthTile() {
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
    <div className="mt-2.5">
      <label className="flex cursor-pointer items-center gap-[11px] rounded-[14px] bg-[var(--surface-2)] px-[13px] py-3">
        <IconTile color="#f87171" size={34} radius={12}>
          <HeartPulse size={17} />
        </IconTile>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium">{t("Apple Health import")}</div>
          <div className="truncate text-[11px] text-[var(--text-faint)]">
            {busy ? t("Importing…") : t("Import an export.xml from the Health app")}
          </div>
        </div>
        <ChevronRight size={16} className="shrink-0 text-[var(--text-faint)]" />
        <input
          type="file"
          accept=".xml,text/xml,application/xml"
          className="hidden"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
      <p className="mt-2 text-[11px] leading-[1.45] text-[var(--text-faint)]">
        {t("Bring in sleep, weight and workouts from Apple Health. On your iPhone: Health app → your photo → “Export All Health Data”, unzip it, then upload the export.xml here.")}{" "}
        {t("Everything is parsed on your device. Existing days are never overwritten. (Apple has no live web sync — this is a manual import.)")}
      </p>
      {result && <p className="mt-2 text-[11.5px] text-[var(--good)]">{result}</p>}
      {err && <p className="mt-2 text-[11.5px] text-[var(--bad)]">{err}</p>}
    </div>
  );
}

function StravaTile() {
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

  const name = state?.athlete ? [state.athlete.firstname, state.athlete.lastname].filter(Boolean).join(" ") : null;

  return (
    <div>
      <div className="flex items-center gap-[11px] rounded-[14px] bg-[var(--surface-2)] px-[13px] py-3">
        <IconTile color="#fc4c02" size={34} radius={12}>
          <Activity size={17} />
        </IconTile>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[7px] text-[13px] font-medium">
            <span className="truncate">Strava</span>
            {state && <Badge tone="good">{t("Connected")}</Badge>}
          </div>
          <div className="truncate text-[11px] text-[var(--text-faint)]">
            {state
              ? state.lastSync
                ? `${t("Last activity synced")}: ${new Date(state.lastSync * 1000).toLocaleDateString()}`
                : name ?? t("Your Strava activities show up as workouts.")
              : t("Connect Strava to import your runs, rides and workouts automatically.")}
          </div>
        </div>
      </div>
      <div className="mt-[9px] flex gap-2">
        {state ? (
          <>
            <SBtn onClick={sync} disabled={busy}>
              <RefreshCw size={14} /> {busy ? t("Syncing…") : t("Sync now")}
            </SBtn>
            <SBtn tone="outline" onClick={disconnect} disabled={busy}>
              {t("Disconnect")}
            </SBtn>
          </>
        ) : (
          <SBtn onClick={() => (window.location.href = authorizeUrl())} disabled={busy}>
            <Activity size={14} /> {t("Connect Strava")}
          </SBtn>
        )}
      </div>
      {msg && <p className="mt-2 text-[11.5px] text-[var(--good)]">{msg}</p>}
      {err && <p className="mt-2 text-[11.5px] text-[var(--bad)]">{err}</p>}
    </div>
  );
}

function DataCard() {
  const { data, replaceAll, resetAll, updateSettings } = useStore();
  const t = useT();
  const s = data.settings;
  const [confirmReset, setConfirmReset] = useState(false);

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
    <SCard title={t("Data & backup")}>
      <p className="-mt-1 mb-2.5 text-[11.5px] text-[var(--text-muted)]">
        {s.lastBackupAt ? `${t("Last backup")}: ${backupAgeLabel(s.lastBackupAt, t)}` : t("No backup yet")}
      </p>
      <div className="flex flex-wrap gap-2">
        <SBtn tone="surface" onClick={exportData}>
          <Download size={14} /> {t("Export JSON")}
        </SBtn>
        <SFileBtn accept="application/json" onFile={importData}>
          <Upload size={14} /> {t("Import JSON")}
        </SFileBtn>
        {s.demoDataLoaded ? (
          <SBtn tone="surface" onClick={() => replaceAll(clearDemo(data))}>
            <Trash2 size={14} /> {t("Clear demo data")}
          </SBtn>
        ) : (
          <SBtn tone="surface" onClick={() => replaceAll(generateDemo(data))}>
            {t("Load demo data")}
          </SBtn>
        )}
        {!confirmReset && (
          <SBtn tone="danger" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={14} /> {t("Reset everything")}
          </SBtn>
        )}
      </div>
      {confirmReset && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] text-[var(--text-muted)]">
            {t("This deletes all data and restarts onboarding.")}
          </span>
          <SBtn tone="danger" onClick={resetAll}>
            {t("Confirm reset")}
          </SBtn>
          <SBtn tone="outline" onClick={() => setConfirmReset(false)}>
            {t("Cancel")}
          </SBtn>
        </div>
      )}
      <p className="mt-2.5 text-[11px] leading-[1.45] text-[var(--text-faint)]">
        {t("Your data lives only in this browser. Export a backup regularly so you never lose it.")}
      </p>
    </SCard>
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
    <SCard title={t("Feedback")}>
      <div className="flex gap-[7px]">
        {(["idea", "bug"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={clsx(
              "whitespace-nowrap rounded-full border px-[13px] py-1.5 text-[12.5px] font-semibold transition",
              kind === k
                ? "grad-soft border-[color-mix(in_srgb,var(--area-a)_35%,transparent)] area-text"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]",
            )}
          >
            {k === "idea" ? t("Idea / feedback") : t("Bug report")}
          </button>
        ))}
      </div>
      <textarea
        className="mt-[9px] w-full rounded-[13px] border border-[var(--border)] bg-[var(--surface)] px-3 py-[11px] text-[12.5px] leading-[1.5] outline-none transition focus:border-[var(--area-a)]"
        rows={3}
        placeholder={kind === "bug" ? t("What happened? What did you expect?") : t("What could be better?")}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2.5 flex items-center gap-2.5">
        <SBtn tone="primary" onClick={send} disabled={!text.trim()}>
          <Send size={14} /> {t("Send email")}
        </SBtn>
        <span className="truncate text-[11px] text-[var(--text-faint)]">{FEEDBACK_EMAIL}</span>
      </div>
    </SCard>
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
    <SCard title={t("Account & sync")}>
      {sync.email ? (
        <>
          <p className="-mt-1 text-[12.5px] text-[var(--text-muted)]">
            {t("Signed in as")} <span className="font-semibold text-[var(--text)]">{sync.email}</span>
          </p>
          <p className="mt-1 text-[11.5px] text-[var(--text-faint)]">
            {sync.status === "syncing"
              ? t("Syncing…")
              : sync.status === "error"
                ? `${t("Sync error")}: ${sync.error ?? ""}`
                : sync.lastSyncedAt
                  ? `${t("Synced")} · ${new Date(sync.lastSyncedAt).toLocaleTimeString()}`
                  : t("Same data on all your devices.")}
          </p>
          <div className="mt-2.5 flex gap-2">
            <SBtn onClick={() => sync.syncNow()}>
              <RefreshCw size={14} /> {t("Sync now")}
            </SBtn>
            <SBtn tone="outline" onClick={() => sync.signOut()}>
              {t("Sign out")}
            </SBtn>
          </div>
        </>
      ) : (
        <>
          <p className="-mt-1 text-[12.5px] text-[var(--text-muted)]">
            {t("Sign in to keep the same data on your phone and PC.")}
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-[9px]">
            <SField label={t("Email")}>
              <input className={sInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </SField>
            <SField label={t("Password")}>
              <input className={sInput} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </SField>
          </div>
          {err && <p className="mt-2 text-[11.5px] text-[var(--bad)]">{err}</p>}
          <div className="mt-2.5 flex items-center gap-2.5">
            <SBtn onClick={submit} disabled={busy || !email || !password}>
              {mode === "in" ? t("Sign in") : t("Create account")}
            </SBtn>
            <button
              onClick={() => {
                setMode(mode === "in" ? "up" : "in");
                setErr(null);
              }}
              className="area-text text-[11.5px] font-medium"
            >
              {mode === "in" ? t("Create account") : t("Have an account? Sign in")}
            </button>
          </div>
        </>
      )}
    </SCard>
  );
}

function RemindersCard() {
  const { data, updateSettings } = useStore();
  const t = useT();
  const r = data.settings.reminders;
  const lang = data.settings.language;
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErr, setPushErr] = useState<PushError | null>(null);

  const checkinTime = r.checkinTime ?? "21:00";
  // Freshly computed weekly-recap text stored server-side for the Sunday-evening push.
  const recap = () => weeklyRecapText(data, lang);

  /** One switch for the whole feature: asks for the browser permission on the way in. */
  async function toggleEnabled(v: boolean) {
    if (!v) {
      updateSettings({ reminders: { ...r, enabled: false } });
      return;
    }
    if (perm === "unsupported") return;
    if (perm !== "granted") {
      const res = await Notification.requestPermission();
      setPerm(res);
      if (res !== "granted") return;
    }
    updateSettings({ reminders: { ...r, enabled: true } });
  }

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

  const suggestedHour = typicalLogHour(data.habitLogs);
  const suggested = suggestedHour == null ? null : `${String(suggestedHour).padStart(2, "0")}:00`;

  return (
    <SCard title={t("Reminders")} icon={<BellRing size={16} />}>
      <SRow
        title={t("Enable notifications")}
        desc={
          perm === "unsupported"
            ? t("Notifications aren't supported here.")
            : perm === "denied"
              ? t("Notifications are blocked — allow them in your browser settings.")
              : t("Browser permission required.")
        }
      >
        <Toggle checked={r.enabled && perm === "granted"} onChange={toggleEnabled} />
      </SRow>

      {r.enabled && perm === "granted" && (
        <>
          <SRow title={t("Reminder time")}>
            <input
              type="time"
              className="num rounded-[11px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12.5px] outline-none transition focus:border-[var(--area-a)]"
              value={checkinTime}
              onChange={(e) => updateTime(e.target.value)}
            />
          </SRow>
          {suggested && suggested !== checkinTime && (
            <button onClick={() => updateTime(suggested)} className="area-text mt-1.5 text-[11.5px] hover:underline">
              {t("You usually log around {time} — use that?", { time: suggested })}
            </button>
          )}

          <SRow title={t("Include still-open habits")} desc={t("Adds the habits you haven't ticked off yet.")}>
            <Toggle
              checked={r.habitReminders}
              onChange={(v) => {
                updateSettings({ reminders: { ...r, habitReminders: v } });
                if (r.push) void syncPush(checkinTime, v, lang, !!r.weeklyRecap, recap());
              }}
            />
          </SRow>

          {pushConfigured && (
            <>
              <SRow
                title={t("Push notifications")}
                desc={t("Get the reminder as a real notification even when the app isn't open.")}
              >
                <Toggle checked={!!r.push && !pushBusy} onChange={togglePush} />
              </SRow>
              {pushErr && <p className="mt-1 text-[11.5px] text-[var(--bad)]">{PUSH_ERR[pushErr]}</p>}
              {r.push && (
                <SRow title={t("Weekly recap")} desc={t("Your Life-Score trend + the week's key insight.")}>
                  <Toggle checked={!!r.weeklyRecap} onChange={toggleWeekly} />
                </SRow>
              )}
            </>
          )}
        </>
      )}
    </SCard>
  );
}

const SEXES: NonNullable<Profile["sex"]>[] = ["male", "female", "other", "prefer_not"];
const ACTIVITY: NonNullable<Profile["activityLevel"]>[] = ["sedentary", "light", "moderate", "active", "athlete"];

/** Accent picker as the design has it: a row of 26px dots inside the Appearance card,
 *  with a link to the shop for the ones still locked. */
function AccentRow() {
  const { data, updateSettings } = useStore();
  const d = useDerived();
  const t = useT();
  const level = computeLevel(data, d.history).level;
  const owned = data.rewards.owned ?? [];
  const current = data.settings.accent ?? "calm";
  const available = ACCENT_REWARDS.filter((r) => accentOwned(r.accent, level, owned));
  const lockedCount = ACCENT_REWARDS.length - available.length;
  return (
    <>
      <div className="mt-3.5 text-[13px] font-medium">{t("Accent")}</div>
      <div className="mt-[7px] flex flex-wrap items-center gap-2">
        {available.map((r) => (
          <button
            key={r.accent}
            onClick={() => updateSettings({ accent: r.accent })}
            title={t(r.name)}
            aria-label={t(r.name)}
            className="h-[26px] w-[26px] rounded-full transition"
            style={{
              background: ACCENT_SWATCH[r.accent],
              boxShadow:
                current === r.accent ? `0 0 0 2px var(--surface), 0 0 0 4px ${ACCENT_SWATCH[r.accent]}` : undefined,
            }}
          />
        ))}
        {lockedCount > 0 && (
          <Link href="/rewards" className="text-[11px] text-[var(--text-dim)] hover:text-[var(--text)]">
            +{lockedCount} {t("in the shop")}
          </Link>
        )}
      </div>

      {/* The accent normally paints every gradient in the app. Turn this on to give each
          page its own Pulse hue back (rosé Health, orange Training, teal Finances …). */}
      <div className="mt-2.5 border-t border-[var(--surface-2)]">
        <SRow
          title={t("Per-page colours")}
          desc={t("Off, your accent colours the whole app. On, each page keeps its own hue.")}
        >
          <Toggle checked={data.settings.areaColors ?? false} onChange={(v) => updateSettings({ areaColors: v })} />
        </SRow>
      </div>
    </>
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
    <SCard title={t("Profile")} icon={<User size={16} />}>
      <div className="grid grid-cols-2 gap-[9px]">
        <SField label={t("Name")}>
          <input className={sInput} value={p.name ?? ""} onChange={(e) => updateProfile({ name: e.target.value })} />
        </SField>
        <SField label={t("Age")}>
          <input
            type="number"
            inputMode="numeric"
            min={5}
            max={120}
            placeholder={t("years")}
            className={sInput}
            value={age ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              updateProfile({ birthDate: v ? `${new Date().getFullYear() - Number(v)}-01-01` : undefined });
            }}
          />
        </SField>
        <SField label={t("Sex")}>
          <select
            className={sInput}
            value={p.sex ?? "prefer_not"}
            onChange={(e) => updateProfile({ sex: e.target.value as Profile["sex"] })}
          >
            {SEXES.map((x) => (
              <option key={x} value={x}>
                {t(x)}
              </option>
            ))}
          </select>
        </SField>
        <SField label={t("Height (cm)")}>
          <input
            type="number"
            className={sInput}
            value={p.heightCm ?? ""}
            onChange={(e) => updateProfile({ heightCm: e.target.value ? Number(e.target.value) : undefined })}
          />
        </SField>
        <SField label={t("Activity level")}>
          <select
            className={sInput}
            value={p.activityLevel ?? "moderate"}
            onChange={(e) => updateProfile({ activityLevel: e.target.value as Profile["activityLevel"] })}
          >
            {ACTIVITY.map((x) => (
              <option key={x} value={x}>
                {t(x)}
              </option>
            ))}
          </select>
        </SField>
        <SField label={t("Current weight (kg)")}>
          <input
            type="number"
            className={sInput}
            placeholder={latestWeight ? String(latestWeight) : ""}
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
          />
        </SField>
      </div>

      <div className="mt-[11px] flex flex-wrap items-center gap-[9px]">
        <SBtn
          onClick={() => {
            if (weightInput) {
              saveWeight({ date: todayISO(), kg: Number(weightInput) });
              setWeightInput("");
            }
          }}
          disabled={!weightInput}
        >
          <Scale size={14} /> {t("Log weight")}
        </SBtn>
        {age !== undefined && (
          <Badge tone="accent">
            {age} {t("years")}
          </Badge>
        )}
        {bmi !== undefined && (
          <Badge tone="accent">
            {t("BMI")} {bmi.toFixed(1)}
          </Badge>
        )}
        {latestWeight !== undefined && (
          <Badge>
            {latestWeight} kg · {fmtShort(data.weight[data.weight.length - 1].date)}
          </Badge>
        )}
      </div>

      {weightChart.length >= 2 && (
        <div className="mt-3.5">
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
            {t("Weight trend")}
          </div>
          <TrendLine data={weightChart} color="var(--area-a)" name={t("Current weight (kg)")} height={140} unit=" kg" />
        </div>
      )}

      <p className="mt-2.5 text-[11px] leading-[1.45] text-[var(--text-faint)]">
        {t("Used to personalize the app and enrich your stats. Optional and private.")}
      </p>
    </SCard>
  );
}
