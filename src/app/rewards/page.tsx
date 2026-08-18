"use client";

import { useMemo, useState } from "react";
import { Check, Coins, CircleDot, Gift, Palette, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { fmtShort } from "@/lib/date";
import { computeLevel } from "@/lib/level";
import { ACCENT_REWARDS, ACCENT_SWATCH, accentOwned } from "@/lib/rewards";
import { RING_SKINS, ringOwned } from "@/lib/cosmetics";
import {
  REWARD_TEMPLATES,
  pointsBalance,
  pointsEarned,
  dailyRate,
  daysToAfford,
} from "@/lib/rewardShop";
import { Card, PageHeader, SectionTitle, Button, Field, inputCls, NumberInput, EmptyState, Badge } from "@/components/ui";
import { HintCard } from "@/components/HintCard";
import clsx from "clsx";

export default function RewardsPage() {
  const { data, saveReward, removeReward, redeemReward, undoRedemption, buyCosmetic, purchaseCosmetic, updateSettings } = useStore();
  const d = useDerived();
  const t = useT();

  const earned = useMemo(() => pointsEarned(d.history, data), [d.history, data]);
  const balance = useMemo(() => pointsBalance(d.history, data.rewards.redemptions, data), [d.history, data]);
  const rate = useMemo(() => dailyRate(d.history, data), [d.history, data]);
  const level = useMemo(() => computeLevel(data, d.history), [data, d.history]);
  const owned = data.rewards.owned ?? [];
  const cosmetics = ACCENT_REWARDS.filter((r) => r.cost > 0);

  const items = [...data.rewards.items].sort((a, b) => a.cost - b.cost);
  const redemptions = [...data.rewards.redemptions].sort((a, b) => (a.date < b.date ? 1 : -1));

  const [name, setName] = useState("");
  const [cost, setCost] = useState<number | undefined>(200);
  const [icon, setIcon] = useState("🎁");

  const existingNames = new Set(data.rewards.items.map((r) => r.name.toLowerCase()));

  function add() {
    if (!name.trim() || !cost || cost <= 0) return;
    saveReward({ id: "", name: name.trim(), cost, icon: icon.trim() || "🎁" });
    setName("");
    setCost(200);
    setIcon("🎁");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Reward shop")}
        subtitle={t("Earn points by living well, then cash them in for rewards you set yourself.")}
      />

      <HintCard id="rewards" title={t("How points work")}>
        {t("You earn points for being active: every habit you complete, workout, check-in, sleep log and journal entry adds points, plus a small bonus for a good day. The more you do, the faster they add up. Spend them on your own rewards or on cosmetics.")}
      </HintCard>

      {/* Balance */}
      <Card className="flex flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <Coins size={22} />
          <span className="num text-4xl font-bold">{balance.toLocaleString()}</span>
        </div>
        <div className="text-sm text-[var(--text-muted)]">{t("points to spend")}</div>
        <div className="mt-1 flex gap-4 text-xs text-[var(--text-faint)]">
          <span>{t("Earned")}: {earned.toLocaleString()}</span>
          <span>{t("~{n} pts / day", { n: rate.toFixed(1) })}</span>
        </div>
      </Card>

      {/* Your rewards */}
      <Card>
        <SectionTitle right={<Gift size={16} className="text-[var(--text-faint)]" />}>{t("Your rewards")}</SectionTitle>
        {items.length === 0 ? (
          <EmptyState icon={<Gift size={26} />} title={t("No rewards yet")} hint={t("Add one below or pick a template to get started.")} />
        ) : (
          <div className="space-y-2.5">
            {items.map((r) => {
              const affordable = balance >= r.cost;
              const days = daysToAfford(r.cost, balance, rate);
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl bg-[var(--surface-2)] p-3">
                  <span className="text-2xl">{r.icon ?? "🎁"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t(r.name)}</div>
                    <div className="text-xs text-[var(--text-faint)]">
                      {r.cost.toLocaleString()} {t("pts")}
                      {!affordable && days != null && ` · ${t("~{n} days away", { n: days })}`}
                      {!affordable && days == null && ` · ${t("keep logging to earn points")}`}
                    </div>
                  </div>
                  <button
                    onClick={() => removeReward(r.id)}
                    className="text-[var(--text-faint)] hover:text-[var(--bad)]"
                    aria-label={t("Delete")}
                  >
                    <Trash2 size={14} />
                  </button>
                  <Button size="sm" disabled={!affordable} onClick={() => redeemReward(r)}>
                    {affordable ? t("Redeem") : t("Locked")}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add custom */}
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{t("Add a reward")}</div>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={t("Emoji")} className="w-16">
              <input className={`${inputCls} text-center`} value={icon} maxLength={2} onChange={(e) => setIcon(e.target.value)} />
            </Field>
            <Field label={t("Name")} className="min-w-[8rem] flex-1">
              <input className={inputCls} placeholder={t("e.g. Spa afternoon")} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
            </Field>
            <Field label={t("Cost (pts)")} className="w-24">
              <NumberInput value={cost} min={1} onChange={setCost} />
            </Field>
            <Button onClick={add} disabled={!name.trim() || !cost}>
              <Plus size={16} /> {t("Add")}
            </Button>
          </div>
        </div>

        {/* Templates */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{t("Ideas")}</div>
          <div className="flex flex-wrap gap-1.5">
            {REWARD_TEMPLATES.filter((tpl) => !existingNames.has(t(tpl.name).toLowerCase()) && !existingNames.has(tpl.name.toLowerCase())).map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => saveReward({ id: "", name: tpl.name, cost: tpl.cost, icon: tpl.icon })}
                className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-medium hover:border-[var(--accent)]"
              >
                <span>{tpl.icon}</span> {t(tpl.name)}
                <span className="text-xs text-[var(--text-faint)]">{tpl.cost}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Cosmetics */}
      <Card>
        <SectionTitle right={<Palette size={16} className="text-[var(--text-faint)]" />}>{t("Cosmetics")}</SectionTitle>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          {t("Spend points on accent themes. Purely cosmetic — they never touch your data or score.")}
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {cosmetics.map((r) => {
            const isOwned = accentOwned(r.accent, level.level, owned);
            const active = (data.settings.accent ?? "calm") === r.accent;
            const affordable = balance >= r.cost;
            const days = daysToAfford(r.cost, balance, rate);
            return (
              <div
                key={r.accent}
                className={clsx(
                  "flex items-center gap-3 rounded-xl border p-3",
                  active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface-2)]",
                )}
              >
                <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: ACCENT_SWATCH[r.accent] }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t(r.name)}</div>
                  <div className="text-xs text-[var(--text-faint)]">
                    {isOwned
                      ? t("Owned")
                      : `${r.cost.toLocaleString()} ${t("pts")}${!affordable && days != null ? ` · ${t("~{n} days away", { n: days })}` : ""}`}
                  </div>
                </div>
                {isOwned ? (
                  <Button size="sm" variant={active ? "soft" : "primary"} disabled={active} onClick={() => updateSettings({ accent: r.accent })}>
                    {active ? (
                      <>
                        <Check size={14} /> {t("Active")}
                      </>
                    ) : (
                      t("Apply")
                    )}
                  </Button>
                ) : (
                  <Button size="sm" disabled={!affordable} onClick={() => buyCosmetic(r.accent, r.cost, r.name)}>
                    {affordable ? t("Buy") : t("Locked")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Score-ring skins */}
      <Card>
        <SectionTitle right={<CircleDot size={16} className="text-[var(--text-faint)]" />}>{t("Score-ring skins")}</SectionTitle>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          {t("Restyle the big Life Score ring on your dashboard. Purely cosmetic.")}
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {RING_SKINS.map((s) => {
            const isOwned = ringOwned(s.id, owned);
            const active = (data.settings.ringSkin ?? "default") === s.id;
            const affordable = balance >= s.cost;
            const days = daysToAfford(s.cost, balance, rate);
            const grad = s.id === "default" ? "var(--grad)" : `linear-gradient(135deg, ${s.gradA}, ${s.gradB})`;
            return (
              <div
                key={s.id}
                className={clsx(
                  "flex items-center gap-3 rounded-xl border p-3",
                  active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface-2)]",
                )}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: grad, boxShadow: s.glow ? `0 0 8px ${s.glow}` : undefined }}
                >
                  <span className="h-4 w-4 rounded-full bg-[var(--surface)]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t(s.name)}</div>
                  <div className="text-xs text-[var(--text-faint)]">
                    {isOwned
                      ? t("Owned")
                      : `${s.cost.toLocaleString()} ${t("pts")}${!affordable && days != null ? ` · ${t("~{n} days away", { n: days })}` : ""}`}
                  </div>
                </div>
                {isOwned ? (
                  <Button size="sm" variant={active ? "soft" : "primary"} disabled={active} onClick={() => updateSettings({ ringSkin: s.id })}>
                    {active ? (
                      <>
                        <Check size={14} /> {t("Active")}
                      </>
                    ) : (
                      t("Apply")
                    )}
                  </Button>
                ) : (
                  <Button size="sm" disabled={!affordable} onClick={() => { purchaseCosmetic(`ring:${s.id}`, s.cost, `Ring: ${s.name}`); updateSettings({ ringSkin: s.id }); }}>
                    {affordable ? t("Buy") : t("Locked")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* History */}
      {redemptions.length > 0 && (
        <Card>
          <SectionTitle>{t("Redeemed")}</SectionTitle>
          <div className="divide-y divide-[var(--border)]">
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium">{t(r.name)}</span>
                  <span className="ml-2 text-xs text-[var(--text-faint)]">{fmtShort(r.date.slice(0, 10))}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="bad">−{r.cost} {t("pts")}</Badge>
                  <button onClick={() => undoRedemption(r.id)} className="flex items-center gap-1 text-xs text-[var(--text-faint)] hover:text-[var(--text)]" aria-label={t("Undo")}>
                    <RotateCcw size={13} /> {t("Undo")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
