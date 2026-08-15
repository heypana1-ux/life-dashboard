"use client";

import { useMemo } from "react";
import { Lock, Shuffle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { computeLevel } from "@/lib/level";
import {
  AvatarConfig,
  defaultAvatar,
  randomAvatar,
  SKINS,
  HAIR_COLORS,
  SHIRT_COLORS,
  HAIR_STYLES,
  FACES,
  HATS,
  GLASSES,
  Option,
} from "@/lib/avatar";
import { Avatar } from "@/components/Avatar";
import { Card, PageHeader, SectionTitle, Button, Badge } from "@/components/ui";

export default function AvatarPage() {
  const { data, updateSettings } = useStore();
  const d = useDerived();
  const t = useT();
  const level = useMemo(() => computeLevel(data, d.history), [data, d.history]);
  const cfg: AvatarConfig = data.settings.avatar ?? defaultAvatar();

  const set = (patch: Partial<AvatarConfig>) => updateSettings({ avatar: { ...cfg, ...patch } });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Character")}
        subtitle={t("Build your look and unlock cosmetics as you level up.")}
        action={
          <Button variant="soft" onClick={() => updateSettings({ avatar: randomAvatar() })}>
            <Shuffle size={16} /> {t("Randomize")}
          </Button>
        }
      />

      <Card className="flex flex-col items-center gap-3">
        <div className="grad flex h-40 w-40 items-center justify-center rounded-full">
          <Avatar config={cfg} size={150} />
        </div>
        <Badge tone="accent">{t("Level {n}", { n: level.level })}</Badge>
      </Card>

      <ColorRow title={t("Skin")} colors={SKINS} value={cfg.skin} onPick={(c) => set({ skin: c })} />
      <OptionRow title={t("Hair")} options={HAIR_STYLES} value={cfg.hair} level={level.level} onPick={(id) => set({ hair: id })} />
      <ColorRow title={t("Hair colour")} colors={HAIR_COLORS} value={cfg.hairColor} onPick={(c) => set({ hairColor: c })} />
      <OptionRow title={t("Face")} options={FACES} value={cfg.face} level={level.level} onPick={(id) => set({ face: id })} />
      <ColorRow title={t("Shirt")} colors={SHIRT_COLORS} value={cfg.shirt} onPick={(c) => set({ shirt: c })} />
      <OptionRow title={t("Hat")} options={HATS} value={cfg.hat} level={level.level} onPick={(id) => set({ hat: id })} />
      <OptionRow title={t("Glasses")} options={GLASSES} value={cfg.glasses} level={level.level} onPick={(id) => set({ glasses: id })} />
    </div>
  );
}

function ColorRow({ title, colors, value, onPick }: { title: string; colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <div className="flex flex-wrap gap-2.5">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            className={`h-9 w-9 rounded-full border-2 transition ${value === c ? "border-[var(--accent)] scale-110" : "border-[var(--border)]"}`}
            style={{ background: c }}
            aria-label={c}
          />
        ))}
      </div>
    </Card>
  );
}

function OptionRow({ title, options, value, level, onPick }: { title: string; options: Option[]; value: string; level: number; onPick: (id: string) => void }) {
  const t = useT();
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const open = level >= o.unlock;
          const active = value === o.id;
          return (
            <button
              key={o.id}
              disabled={!open}
              onClick={() => onPick(o.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                active ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-2)]"
              } ${open ? "" : "opacity-55"}`}
            >
              {!open && <Lock size={11} />}
              {t(o.name)}
              {!open && <span className="text-[10px] text-[var(--text-faint)]">{t("Lvl {n}", { n: o.unlock })}</span>}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
