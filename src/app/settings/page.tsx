"use client";

import { useState } from "react";
import { Download, Monitor, Moon, RotateCcw, Sun, Trash2, Upload, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { AreaKey, Language, Profile } from "@/lib/types";
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

      {/* Data */}
      <Card>
        <SectionTitle>{t("Data")}</SectionTitle>
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

      <p className="pb-4 text-center text-xs text-[var(--text-faint)]">
        {t("Life Dashboard · your data lives in this browser only.")}
      </p>
    </div>
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
            type="date"
            className={inputCls}
            value={p.birthDate ?? ""}
            onChange={(e) => updateProfile({ birthDate: e.target.value })}
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
