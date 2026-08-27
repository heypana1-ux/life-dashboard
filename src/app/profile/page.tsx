"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, Globe, Lock, Save, User, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { Profile } from "@/lib/types";
import { computeLevel } from "@/lib/level";
import { activityStreak } from "@/lib/streak";
import { computeAchievements } from "@/lib/achievements";
import { titleName, badgeEmoji } from "@/lib/cosmetics";
import { ACCENT_REWARDS, ACCENT_SWATCH, accentOwned } from "@/lib/rewards";
import { resizeImageToDataUrl } from "@/lib/image";
import { ageFrom, todayISO } from "@/lib/date";
import { ProfileView, ProfileCardData } from "@/components/ProfileView";
import { Card, PageHeader, SectionTitle, Button, Field, Toggle, inputCls } from "@/components/ui";
import clsx from "clsx";

const SEXES: NonNullable<Profile["sex"]>[] = ["male", "female", "other", "prefer_not"];
const ACTIVITY: NonNullable<Profile["activityLevel"]>[] = ["sedentary", "light", "moderate", "active", "athlete"];
const SEX_LABEL: Record<string, string> = { male: "Male", female: "Female", other: "Other", prefer_not: "Prefer not to say" };
const ACT_LABEL: Record<string, string> = { sedentary: "Sedentary", light: "Light", moderate: "Moderate", active: "Active", athlete: "Athlete" };

export default function ProfilePage() {
  const { data, updateProfile, updateSettings, saveWeight } = useStore();
  const d = useDerived();
  const t = useT();
  const p = data.settings.profile;
  const fileRef = useRef<HTMLInputElement>(null);

  const latestWeight = [...data.weight].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-1)[0];
  const [weight, setWeight] = useState(latestWeight ? String(latestWeight.kg) : "");

  const card = useMemo<ProfileCardData>(() => {
    const level = computeLevel(data, d.history).level;
    const owned = data.rewards.owned ?? [];
    const streak = activityStreak(d.history, data.settings);
    const elo = d.history.length ? d.history[d.history.length - 1].elo : undefined;
    const achievements = computeAchievements(data, d.history)
      .filter((a) => a.unlocked)
      .map((a) => ({ icon: a.icon, title: t(a.title) }));
    const accents = ACCENT_REWARDS.filter((r) => accentOwned(r.accent, level, owned)).map((r) => ACCENT_SWATCH[r.accent]);
    return {
      displayName: p.displayName || p.name || t("Anonymous"),
      avatar: p.avatar,
      level,
      title: titleName(data.settings.title),
      badge: badgeEmoji(data.settings.badge),
      overall: d.avg7,
      elo,
      streak,
      accents,
      achievements,
    };
  }, [data, d, p, t]);

  async function pickAvatar(file?: File) {
    if (!file) return;
    try {
      const url = await resizeImageToDataUrl(file, 512, 0.75);
      updateProfile({ avatar: url });
    } catch {
      /* ignore */
    }
  }

  const age = p.birthDate ? ageFrom(p.birthDate) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader title={t("Profile")} subtitle={t("How you show up — to yourself and others.")} />

      <ProfileView p={card} />

      {/* Public / private */}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              {p.isPublic ? <Globe size={17} /> : <Lock size={17} />}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium">{t("Public profile")}</div>
              <div className="text-xs text-[var(--text-muted)]">
                {t("When on, people you share a scoreboard with can open this card (name, level, titles, achievements). Never your logs.")}
              </div>
            </div>
          </div>
          <Toggle checked={!!p.isPublic} onChange={(v) => updateProfile({ isPublic: v })} />
        </div>
      </Card>

      {/* Identity */}
      <Card>
        <SectionTitle right={<User size={16} className="text-[var(--text-faint)]" />}>{t("Identity")}</SectionTitle>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]"
          >
            {p.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[var(--text-faint)]"><Camera size={20} /></span>
            )}
          </button>
          <div className="min-w-0 flex-1 space-y-2">
            <Field label={t("Display name (nickname)")}>
              <input
                className={inputCls}
                value={p.displayName ?? ""}
                maxLength={40}
                onChange={(e) => updateProfile({ displayName: e.target.value })}
                placeholder={t("How others see you")}
              />
            </Field>
            {p.avatar && (
              <button onClick={() => updateProfile({ avatar: undefined })} className="flex items-center gap-1 text-xs text-[var(--text-faint)] hover:text-[var(--bad)]">
                <X size={12} /> {t("Remove photo")}
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickAvatar(e.target.files?.[0])} />
      </Card>

      {/* Personal details */}
      <Card>
        <SectionTitle>{t("Personal details")}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Name")}>
            <input className={inputCls} value={p.name ?? ""} onChange={(e) => updateProfile({ name: e.target.value })} />
          </Field>
          <Field label={t("Birth date")} hint={age != null ? `${t("Age")}: ${age}` : undefined}>
            <input type="date" max={todayISO()} className={inputCls} value={p.birthDate ?? ""} onChange={(e) => updateProfile({ birthDate: e.target.value })} />
          </Field>
          <Field label={t("Height (cm)")}>
            <input
              type="number"
              inputMode="numeric"
              className={inputCls}
              value={p.heightCm ?? ""}
              onChange={(e) => updateProfile({ heightCm: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
          <Field label={t("Weight today (kg)")}>
            <div className="flex gap-2">
              <input type="number" inputMode="decimal" step="0.1" className={inputCls} value={weight} onChange={(e) => setWeight(e.target.value)} />
              <Button variant="soft" size="sm" onClick={() => { const v = Number(weight); if (v > 0) saveWeight({ date: todayISO(), kg: Math.round(v * 10) / 10 }); }} disabled={!weight}>
                <Save size={15} />
              </Button>
            </div>
          </Field>
        </div>

        <div className="mt-3">
          <div className="mb-1 text-sm font-medium text-[var(--text-muted)]">{t("Sex")}</div>
          <div className="flex flex-wrap gap-2">
            {SEXES.map((sx) => (
              <button
                key={sx}
                onClick={() => updateProfile({ sex: p.sex === sx ? undefined : sx })}
                className={clsx("rounded-full border px-3 py-1.5 text-sm", p.sex === sx ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]")}
              >
                {t(SEX_LABEL[sx])}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 text-sm font-medium text-[var(--text-muted)]">{t("Activity level")}</div>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY.map((a) => (
              <button
                key={a}
                onClick={() => updateProfile({ activityLevel: p.activityLevel === a ? undefined : a })}
                className={clsx("rounded-full border px-3 py-1.5 text-sm", p.activityLevel === a ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]")}
              >
                {t(ACT_LABEL[a])}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
