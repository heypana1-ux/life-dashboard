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
import { Card, PageHeader, HeaderPill, SectionTitle, Badge } from "@/components/ui";

export default function AvatarPage() {
  const { data, updateSettings } = useStore();
  const d = useDerived();
  const t = useT();
  const level = useMemo(() => computeLevel(data, d.history), [data, d.history]);
  const cfg: AvatarConfig = data.settings.avatar ?? defaultAvatar();

  const set = (patch: Partial<AvatarConfig>) => updateSettings({ avatar: { ...cfg, ...patch } });
  // Cosmetics the current level has opened up — the kicker's real number.
  const unlockedCount = [...HAIR_STYLES, ...FACES, ...HATS, ...GLASSES].filter((o) => level.level >= o.unlock).length;

  return (
    <div className="space-y-[14px]">
      <PageHeader
        kicker={`${t("Level")} ${level.level} · ${t("{n} items unlocked", { n: unlockedCount })}`}
        title={t("Character")}
        subtitle={t("Build your look and unlock cosmetics as you level up.")}
        action={
          <HeaderPill soft onClick={() => updateSettings({ avatar: randomAvatar() })}>
            <Shuffle size={14} /> {t("Random")}
          </HeaderPill>
        }
      />

      <Card className="flex flex-col items-center gap-[11px]">
        <div className="area-grad flex h-[150px] w-[150px] items-center justify-center rounded-full">
          <Avatar config={cfg} size={140} />
        </div>
        <Badge tone="accent">{t("Level {n}", { n: level.level })}</Badge>
        <p className="text-[10.5px] text-[var(--text-dim)]">
          {t("Character preview — rendered from your avatar config.")}
        </p>
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
      <div className="flex flex-wrap gap-[9px]">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            className={`h-[34px] w-[34px] rounded-full border-2 transition ${value === c ? "border-[var(--area-a)]" : "border-[var(--border)]"}`}
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
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const open = level >= o.unlock;
          const active = value === o.id;
          return (
            <button
              key={o.id}
              disabled={!open}
              onClick={() => onPick(o.id)}
              className={`flex items-center gap-[5px] rounded-full border px-3 py-[7px] text-[11.5px] font-medium transition ${
                active
                  ? "grad-soft border-[var(--area-a)] text-[var(--text)]"
                  : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]"
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
