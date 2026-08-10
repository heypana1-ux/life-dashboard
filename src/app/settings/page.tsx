"use client";

import { useState } from "react";
import { Download, Monitor, Moon, RotateCcw, Sun, Trash2, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { AreaKey } from "@/lib/types";
import { generateDemo, clearDemo } from "@/lib/demo";
import { Card, PageHeader, SectionTitle, Button, Toggle, Badge, Field } from "@/components/ui";
import clsx from "clsx";

export default function SettingsPage() {
  const { data, updateSettings, setAreas, replaceAll, resetAll } = useStore();
  const s = data.settings;
  const [confirmReset, setConfirmReset] = useState(false);

  const enabledWeightSum = s.areas
    .filter((a) => a.enabled)
    .reduce((acc, a) => acc + a.weight, 0);

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
        if (parsed && parsed.settings && Array.isArray(parsed.habits)) {
          replaceAll(parsed);
        } else {
          alert("That file doesn't look like a Life Dashboard export.");
        }
      } catch {
        alert("Could not read that file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Tune what you track and how your score is computed." />

      {/* Theme */}
      <Card>
        <SectionTitle>Appearance</SectionTitle>
        <div className="flex gap-2">
          {[
            { k: "light", label: "Light", icon: Sun },
            { k: "dark", label: "Dark", icon: Moon },
            { k: "system", label: "System", icon: Monitor },
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

      {/* Areas & weights */}
      <Card>
        <SectionTitle
          right={
            <span className={clsx("text-xs", enabledWeightSum > 0 ? "text-[var(--text-faint)]" : "text-[var(--bad)]")}>
              normalized to 100%
            </span>
          }
        >
          Life areas & score weights
        </SectionTitle>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Turn areas on or off, and set how much each contributes to your Life Score. Weights of
          enabled areas are normalized — disabling one redistributes its share automatically.
        </p>
        <div className="space-y-3">
          {s.areas.map((a) => (
            <div key={a.key} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.label}</span>
                  {a.key === "finances" && <Badge>manual only</Badge>}
                  {a.enabled && (
                    <Badge tone="accent">{normalizedPct(a.weight)}%</Badge>
                  )}
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
        <SectionTitle>Sleep target</SectionTitle>
        <Field label={`${Math.round((s.sleepTargetMinutes / 60) * 10) / 10} hours`}>
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

      {/* Data management */}
      <Card>
        <SectionTitle>Data</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {s.demoDataLoaded ? (
            <Button variant="outline" onClick={() => replaceAll(clearDemo(data))}>
              <Trash2 size={16} /> Clear demo data
            </Button>
          ) : (
            <Button variant="outline" onClick={() => replaceAll(generateDemo(data))}>
              Load demo data
            </Button>
          )}
          <Button variant="outline" onClick={exportData}>
            <Download size={16} /> Export JSON
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-2)]">
            <Upload size={16} /> Import JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
            />
          </label>
        </div>

        <div className="mt-4 border-t border-[var(--border)] pt-4">
          {!confirmReset ? (
            <Button variant="ghost" onClick={() => setConfirmReset(true)} className="text-[var(--bad)]">
              <RotateCcw size={16} /> Reset everything
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-muted)]">
                This deletes all data and restarts onboarding.
              </span>
              <Button variant="danger" size="sm" onClick={resetAll}>
                Confirm reset
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Roadmap — honest about what's not built yet */}
      <Card>
        <SectionTitle>Roadmap</SectionTitle>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          This is Phase 1: a working core with real, persistent data. The following are designed
          into the data model but not yet built as full features — shown here rather than as dead
          buttons.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "Finances: net worth, portfolio & budget",
            "Live market data (modular API, mock until configured)",
            "Detailed workout & exercise logging",
            "Learning & creative project boards",
            "Weekly & monthly reports",
            "Achievements & records",
            "Life Experiments (A/B on yourself)",
            "AI insights over your structured data",
            "Health integrations (Apple Health, Whoop, Oura…)",
          ].map((t) => (
            <div key={t} className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
              <Badge>planned</Badge>
              <span className="text-[var(--text-muted)]">{t}</span>
            </div>
          ))}
        </div>
      </Card>

      <p className="pb-4 text-center text-xs text-[var(--text-faint)]">
        Life Dashboard · your data lives in this browser only.
      </p>
    </div>
  );
}
