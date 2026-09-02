"use client";

import { useMemo, useState } from "react";
import { Award, BadgeCheck, Check, Coins, CircleDot, Gift, Palette, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { fmtShort } from "@/lib/date";
import { computeLevel } from "@/lib/level";
import { ACCENT_REWARDS, ACCENT_SWATCH, accentOwned } from "@/lib/rewards";
import { RING_SKINS, ringOwned, TITLES, titleOwned, BADGES, badgeOwned } from "@/lib/cosmetics";
import {
  REWARD_TEMPLATES,
  pointsBalance,
  pointsEarned,
  dailyRate,
  daysToAfford,
} from "@/lib/rewardShop";
import { Card, PageHeader, SectionTitle, ActionPill, Field, inputCls, NumberInput, EmptyState, Badge } from "@/components/ui";
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
    <div className="space-y-[14px]">
      <PageHeader
        kicker={`${balance.toLocaleString()} ${t("points")} · ${t("~{n} pts/day", { n: rate.toFixed(0) })}`}
        lead={t("Reward (lead)")}
        title={t("shop (title)")}
      />

      <HintCard id="rewards" title={t("How points work")}>
        {t("You earn points for being active: every habit you complete, workout, check-in, sleep log and journal entry adds points, plus a small bonus for a good day. The more you do, the faster they add up. Spend them on your own rewards or on cosmetics.")}
      </HintCard>

      {/* Balance */}
      <Card className="flex flex-col items-center gap-[3px] text-center">
        <div className="area-text flex items-center gap-[9px]">
          <Coins size={22} />
          <span className="num text-[38px] font-bold leading-none tracking-[-0.04em]">{balance.toLocaleString()}</span>
        </div>
        <div className="text-[12.5px] text-[var(--text-muted)]">{t("points to spend")}</div>
        <div className="mt-[5px] flex gap-4 text-[11px] text-[var(--text-faint)]">
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
          <div className="flex flex-col gap-[9px]">
            {items.map((r) => {
              const affordable = balance >= r.cost;
              const days = daysToAfford(r.cost, balance, rate);
              return (
                <ShopRow
                  key={r.id}
                  plain
                  swatch={<span className="text-[20px] leading-none">{r.icon ?? "🎁"}</span>}
                  name={t(r.name)}
                  sub={
                    <>
                      {r.cost.toLocaleString()} {t("pts")}
                      {!affordable && days != null && ` · ${t("~{n} days away", { n: days })}`}
                      {!affordable && days == null && ` · ${t("keep logging to earn points")}`}
                    </>
                  }
                >
                  <button
                    onClick={() => removeReward(r.id)}
                    className="shrink-0 text-[var(--text-dim)] hover:text-[var(--bad)]"
                    aria-label={t("Delete")}
                  >
                    <Trash2 size={14} />
                  </button>
                  <ActionPill tone={affordable ? "primary" : "locked"} onClick={() => redeemReward(r)}>
                    {affordable ? t("Redeem") : t("Locked")}
                  </ActionPill>
                </ShopRow>
              );
            })}
          </div>
        )}

        {/* Add custom */}
        <div className="mt-[15px] border-t border-[var(--border)] pt-[15px]">
          <div className="mb-[9px] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">{t("Add a reward")}</div>
          <div className="flex items-end gap-2">
            <Field label={t("Emoji")} className="w-[52px] shrink-0">
              <input className={`${inputCls} text-center`} value={icon} maxLength={2} onChange={(e) => setIcon(e.target.value)} />
            </Field>
            <Field label={t("Name")} className="min-w-0 flex-1">
              <input className={inputCls} placeholder={t("e.g. Spa afternoon")} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
            </Field>
            <Field label={t("Cost")} className="w-[66px] shrink-0">
              <NumberInput value={cost} min={1} onChange={setCost} />
            </Field>
          </div>
          <div className="mt-2.5">
            <ActionPill tone={!name.trim() || !cost ? "locked" : "primary"} onClick={add}>
              <Plus size={13} strokeWidth={2.4} /> {t("Add")}
            </ActionPill>
          </div>
        </div>

        {/* Templates */}
        <div className="mt-[15px]">
          <div className="mb-[9px] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">{t("Ideas")}</div>
          <div className="flex flex-wrap gap-1.5">
            {REWARD_TEMPLATES.filter((tpl) => !existingNames.has(t(tpl.name).toLowerCase()) && !existingNames.has(tpl.name.toLowerCase())).map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => saveReward({ id: "", name: tpl.name, cost: tpl.cost, icon: tpl.icon })}
                className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-[11px] py-[7px] text-[11.5px] font-medium hover:border-[var(--area-a)]"
              >
                <span>{tpl.icon}</span> {t(tpl.name)}
                <span className="num text-[10px] text-[var(--text-faint)]">{tpl.cost}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Cosmetics */}
      <Card>
        <SectionTitle right={<Palette size={16} className="text-[var(--text-faint)]" />}>{t("Cosmetics")}</SectionTitle>
        <p className="-mt-1 mb-[11px] text-[11.5px] text-[var(--text-muted)]">
          {t("Spend points on accent themes. Purely cosmetic — they never touch your data or score.")}
        </p>
        <div className="flex flex-col gap-[9px] sm:grid sm:grid-cols-2">
          {cosmetics.map((r) => {
            const isOwned = accentOwned(r.accent, level.level, owned);
            const active = (data.settings.accent ?? "calm") === r.accent;
            const affordable = balance >= r.cost;
            const days = daysToAfford(r.cost, balance, rate);
            return (
              <ShopRow
                key={r.accent}
                active={active}
                swatch={<span className="h-[34px] w-[34px] shrink-0 rounded-[12px]" style={{ background: ACCENT_SWATCH[r.accent] }} />}
                name={t(r.name)}
                sub={
                  isOwned
                    ? t("Owned")
                    : `${r.cost.toLocaleString()} ${t("pts")}${!affordable && days != null ? ` · ${t("~{n} days away", { n: days })}` : ""}`
                }
              >
                {isOwned ? (
                  <ActionPill tone={active ? "soft" : "primary"} onClick={() => updateSettings({ accent: r.accent })}>
                    {active ? (<><Check size={13} /> {t("Active")}</>) : t("Apply")}
                  </ActionPill>
                ) : (
                  <ActionPill tone={affordable ? "primary" : "locked"} onClick={() => buyCosmetic(r.accent, r.cost, r.name)}>
                    {affordable ? t("Buy") : t("Locked")}
                  </ActionPill>
                )}
              </ShopRow>
            );
          })}
        </div>
      </Card>

      {/* Score-ring skins */}
      <Card>
        <SectionTitle right={<CircleDot size={16} className="text-[var(--text-faint)]" />}>{t("Score-ring skins")}</SectionTitle>
        <p className="-mt-1 mb-[11px] text-[11.5px] text-[var(--text-muted)]">
          {t("Restyle the big Life Score ring on your dashboard. Purely cosmetic.")}
        </p>
        <div className="flex flex-col gap-[9px] sm:grid sm:grid-cols-2">
          {RING_SKINS.map((s) => {
            const isOwned = ringOwned(s.id, owned);
            const active = (data.settings.ringSkin ?? "default") === s.id;
            const affordable = balance >= s.cost;
            const days = daysToAfford(s.cost, balance, rate);
            const grad = s.id === "default" ? "var(--grad)" : `linear-gradient(135deg, ${s.gradA}, ${s.gradB})`;
            return (
              <ShopRow
                key={s.id}
                active={active}
                swatch={
                  <span
                    className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
                    style={{ background: grad, boxShadow: s.glow ? `0 0 8px ${s.glow}` : undefined }}
                  >
                    <span className="h-[15px] w-[15px] rounded-full bg-[var(--surface)]" />
                  </span>
                }
                name={t(s.name)}
                sub={
                  isOwned
                    ? t("Owned")
                    : `${s.cost.toLocaleString()} ${t("pts")}${!affordable && days != null ? ` · ${t("~{n} days away", { n: days })}` : ""}`
                }
              >
                {isOwned ? (
                  <ActionPill tone={active ? "soft" : "primary"} onClick={() => updateSettings({ ringSkin: s.id })}>
                    {active ? (<><Check size={13} /> {t("Active")}</>) : t("Apply")}
                  </ActionPill>
                ) : (
                  <ActionPill tone={affordable ? "primary" : "locked"} onClick={() => { purchaseCosmetic(`ring:${s.id}`, s.cost, `Ring: ${s.name}`); updateSettings({ ringSkin: s.id }); }}>
                    {affordable ? t("Buy") : t("Locked")}
                  </ActionPill>
                )}
              </ShopRow>
            );
          })}
        </div>
      </Card>

      {/* Titles */}
      <Card>
        <SectionTitle right={<Award size={16} className="text-[var(--text-faint)]" />}>{t("Titles")}</SectionTitle>
        <p className="-mt-1 mb-[11px] text-[11.5px] text-[var(--text-muted)]">{t("Wear a title next to your level. Purely cosmetic.")}</p>
        <div className="flex flex-col gap-[9px] sm:grid sm:grid-cols-2">
          {TITLES.filter((x) => x.id !== "none").map((x) => {
            const isOwned = titleOwned(x.id, owned);
            const active = (data.settings.title ?? "none") === x.id;
            const affordable = balance >= x.cost;
            const days = daysToAfford(x.cost, balance, rate);
            return (
              <ShopRow
                key={x.id}
                active={active}
                swatch={<BadgeCheck size={18} className="area-text shrink-0" />}
                name={t(x.name)}
                sub={
                  isOwned
                    ? t("Owned")
                    : `${x.cost.toLocaleString()} ${t("pts")}${!affordable && days != null ? ` · ${t("~{n} days away", { n: days })}` : ""}`
                }
              >
                {isOwned ? (
                  <ActionPill tone={active ? "soft" : "primary"} onClick={() => updateSettings({ title: x.id })}>
                    {active ? (<><Check size={13} /> {t("Active")}</>) : t("Apply")}
                  </ActionPill>
                ) : (
                  <ActionPill tone={affordable ? "primary" : "locked"} onClick={() => { purchaseCosmetic(`title:${x.id}`, x.cost, `Title: ${x.name}`); updateSettings({ title: x.id }); }}>
                    {affordable ? t("Buy") : t("Locked")}
                  </ActionPill>
                )}
              </ShopRow>
            );
          })}
        </div>
        {data.settings.title && data.settings.title !== "none" && (
          <button onClick={() => updateSettings({ title: "none" })} className="mt-3 text-xs text-[var(--text-faint)] hover:text-[var(--text)]">
            {t("Clear title")}
          </button>
        )}
      </Card>

      {/* Badges */}
      <Card>
        <SectionTitle right={<Coins size={16} className="text-[var(--text-faint)]" />}>{t("Badges")}</SectionTitle>
        <p className="-mt-1 mb-[11px] text-[11.5px] text-[var(--text-muted)]">{t("Pin an emoji badge next to your level. Purely cosmetic.")}</p>
        <div className="flex flex-col gap-[9px] sm:grid sm:grid-cols-2">
          {BADGES.filter((x) => x.id !== "none").map((x) => {
            const isOwned = badgeOwned(x.id, owned);
            const active = (data.settings.badge ?? "none") === x.id;
            const affordable = balance >= x.cost;
            const days = daysToAfford(x.cost, balance, rate);
            return (
              <ShopRow
                key={x.id}
                active={active}
                swatch={<span className="w-6 shrink-0 text-center text-[20px] leading-none">{x.emoji}</span>}
                name={t(x.name)}
                sub={
                  isOwned
                    ? t("Owned")
                    : `${x.cost.toLocaleString()} ${t("pts")}${!affordable && days != null ? ` · ${t("~{n} days away", { n: days })}` : ""}`
                }
              >
                {isOwned ? (
                  <ActionPill tone={active ? "soft" : "primary"} onClick={() => updateSettings({ badge: x.id })}>
                    {active ? (<><Check size={13} /> {t("Active")}</>) : t("Apply")}
                  </ActionPill>
                ) : (
                  <ActionPill tone={affordable ? "primary" : "locked"} onClick={() => { purchaseCosmetic(`badge:${x.id}`, x.cost, `Badge: ${x.name}`); updateSettings({ badge: x.id }); }}>
                    {affordable ? t("Buy") : t("Locked")}
                  </ActionPill>
                )}
              </ShopRow>
            );
          })}
        </div>
        {data.settings.badge && data.settings.badge !== "none" && (
          <button onClick={() => updateSettings({ badge: "none" })} className="mt-3 text-xs text-[var(--text-faint)] hover:text-[var(--text)]">
            {t("Clear badge")}
          </button>
        )}
      </Card>

      {/* History */}
      {redemptions.length > 0 && (
        <Card>
          <SectionTitle>{t("Redeemed")}</SectionTitle>
          <div className="divide-y divide-[var(--border)]">
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-[12.5px]">
                <div className="min-w-0 truncate">
                  <span className="font-medium">{t(r.name)}</span>
                  <span className="ml-2 text-[11px] text-[var(--text-faint)]">{fmtShort(r.date.slice(0, 10))}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone="bad">−{r.cost} {t("pts")}</Badge>
                  <button onClick={() => undoRedemption(r.id)} className="flex items-center gap-1 text-[11px] text-[var(--text-faint)] hover:text-[var(--text)]" aria-label={t("Undo")}>
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

/** One purchasable/equippable row: swatch, name + status, action pill. */
function ShopRow({
  swatch,
  name,
  sub,
  active,
  plain,
  children,
}: {
  swatch: React.ReactNode;
  name: string;
  sub: React.ReactNode;
  active?: boolean;
  /** "Your rewards" rows sit on a plain tinted surface, without a border. */
  plain?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-[11px] rounded-[16px] px-[13px] py-3",
        plain
          ? "bg-[var(--surface-2)]"
          : active
            ? "area-soft !text-[var(--text)] border border-[var(--area-a)]"
            : "border border-[var(--border)] bg-[var(--surface-2)]",
      )}
    >
      {swatch}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-medium">{name}</div>
        <div className="text-[11px] text-[var(--text-faint)]">{sub}</div>
      </div>
      {children}
    </div>
  );
}
