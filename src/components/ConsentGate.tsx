"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, HeartPulse, Lock, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { CONSENT_VERSION } from "@/lib/legal";
import { Button, Card } from "@/components/ui";

/*
  The consent step that runs before onboarding.

  What you enter here — sleep, weight, body measurements, mood, wellbeing, journal — is a
  special category of personal data under Art. 9 GDPR. Processing it needs *explicit* consent
  (Art. 9(2)(a)), and "explicit" rules out the usual patterns: no pre-ticked boxes, no bundling
  it into terms you scroll past, and it has to be as easy to withdraw as it was to give (that
  part lives in Settings → Privacy & consent).

  The AI consents are separate and genuinely optional, because they are a different processing
  operation with a different risk: the coach sends data to a provider in the US. Bundling them
  with the health consent would make neither of them freely given.
*/

export function ConsentGate({ onDone }: { onDone: () => void }) {
  const { data, updateSettings } = useStore();
  const t = useT();
  const [health, setHealth] = useState(false);
  const [ai, setAi] = useState(false);
  const [aiJournal, setAiJournal] = useState(false);

  function accept() {
    const now = new Date().toISOString();
    updateSettings({
      consent: {
        version: CONSENT_VERSION,
        health: now,
        ...(ai ? { ai: now } : {}),
        ...(ai && aiJournal ? { aiJournal: now } : {}),
      },
      // The coach stays off unless it was explicitly consented to here.
      aiCoachEnabled: ai,
      aiJournalAccess: ai && aiJournal,
    });
    onDone();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <div className="grad flex h-9 w-9 items-center justify-center rounded-xl text-white">
          <Lock size={19} />
        </div>
        <span className="text-lg font-semibold">Life Dashboard</span>
      </div>

      <Card className="animate-in">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Before we start")}</h1>
        <p className="mt-1.5 text-sm leading-[1.55] text-[var(--text-muted)]">
          {t("Everything you log stays on this device by default. Nothing is sent anywhere unless you switch it on yourself.")}
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <ConsentBox
            checked={health}
            onChange={setHealth}
            icon={<HeartPulse size={16} />}
            title={t("Health-related entries")}
            required
          >
            {t("Sleep, weight, body measurements, mood, wellbeing and journal entries count as health data under Art. 9 GDPR. I agree that the app may store and analyse them for me. Without this the app has nothing to track.")}
          </ConsentBox>

          <ConsentBox
            checked={ai}
            onChange={(v) => {
              setAi(v);
              if (!v) setAiJournal(false);
            }}
            icon={<Sparkles size={16} />}
            title={t("AI coach (optional)")}
          >
            {t("Sends summaries of my data to Groq in the USA so the coach can interpret them. The USA has no EU-equivalent level of data protection. I can withdraw this at any time.")}
          </ConsentBox>

          {ai && (
            <div className="pl-6">
              <ConsentBox
                checked={aiJournal}
                onChange={setAiJournal}
                title={t("Also my journal (optional)")}
                small
              >
                {t("Additionally sends journal text, mood and tags, so the coach can reflect on what you wrote.")}
              </ConsentBox>
            </div>
          )}
        </div>

        <p className="mt-4 text-[11.5px] leading-[1.5] text-[var(--text-faint)]">
          {t("Details in the")}{" "}
          <Link href="/legal/privacy" className="area-text hover:underline">
            {t("privacy notice")}
          </Link>
          {" · "}
          <Link href="/legal/imprint" className="area-text hover:underline">
            {t("Imprint")}
          </Link>
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-[11.5px] text-[var(--text-faint)]">
            {data.settings.language === "de" ? "Widerruf jederzeit in den Einstellungen." : t("Withdraw any time in Settings.")}
          </span>
          <Button onClick={accept} disabled={!health}>
            {t("Agree and continue")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ConsentBox({
  checked,
  onChange,
  title,
  icon,
  required,
  small,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  icon?: React.ReactNode;
  required?: boolean;
  small?: boolean;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <button
      onClick={() => onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      className={clsx(
        "flex w-full items-start gap-3 rounded-[16px] border p-3.5 text-left transition",
        checked
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--text-faint)]",
      )}
    >
      <span
        className={clsx(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
          checked ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)]",
        )}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[13.5px] font-medium">
          {icon}
          {title}
          {required && (
            <span className="rounded-full bg-[var(--surface-3)] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {t("required")}
            </span>
          )}
        </span>
        <span className={clsx("mt-1 block leading-[1.5] text-[var(--text-muted)]", small ? "text-[11.5px]" : "text-[12px]")}>
          {children}
        </span>
      </span>
    </button>
  );
}
