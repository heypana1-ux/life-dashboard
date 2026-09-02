"use client";

import { Flame, Trophy } from "lucide-react";
import { useT } from "@/lib/i18n";

export interface ProfileCardData {
  displayName: string;
  avatar?: string;
  level: number;
  title?: string | null;
  badge?: string | null;
  overall?: number;
  elo?: number;
  streak?: number;
  /** Owned accent gradient CSS strings, for the little swatch row. */
  accents?: string[];
  achievements?: { icon: string; title: string }[];
  /** Number of achievements when the individual icons aren't available (other people's cards). */
  achievementCount?: number;
}

/**
 * Presentational public-profile card — used for your own preview and for other people's.
 * "Pulse" layout: 62px avatar tile beside the name, a three-up stat row, the owned-theme dots
 * and the unlocked badges as small 28px emoji tiles. No banner — the card is the frame.
 */
export function ProfileView({ p }: { p: ProfileCardData }) {
  const t = useT();
  const initial = (p.displayName || "?").trim().charAt(0).toUpperCase();
  const badgeCount = p.achievements?.length ?? p.achievementCount ?? 0;

  return (
    <div className="card p-[18px]">
      <div className="flex items-center gap-3.5">
        <div className="area-grad flex h-[62px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] text-[23px] font-bold">
          {p.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[7px]">
            <h2 className="truncate text-[17px] font-semibold tracking-[-0.02em]">
              {p.displayName || t("Anonymous")}
            </h2>
            {p.badge && <span className="leading-none">{p.badge}</span>}
          </div>
          <div className="mt-[3px] text-[11.5px] text-[var(--text-muted)]">
            {t("Level")} {p.level}
            {p.title ? ` · ${p.title}` : ""}
          </div>
          {p.accents && p.accents.length > 0 && (
            <div className="mt-2 flex gap-[5px]">
              {p.accents.slice(0, 12).map((g, i) => (
                <span key={i} className="h-[9px] w-[9px] rounded-full" style={{ background: g }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-[15px] grid grid-cols-3 gap-2">
        <Stat label={t("Overall")} value={p.overall != null && p.overall > 0 ? String(p.overall) : "—"} />
        <Stat label={t("Rating")} value={p.elo != null ? p.elo.toLocaleString() : "—"} icon={<Trophy size={11} />} />
        <Stat label={t("Streak")} value={p.streak != null ? `${p.streak}d` : "—"} icon={<Flame size={11} />} />
      </div>

      {badgeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10.5px] text-[var(--text-faint)]">{t("{n} unlocked", { n: badgeCount })}</span>
          {(p.achievements ?? []).slice(0, 12).map((a, i) => (
            <span
              key={i}
              title={a.title}
              className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[var(--surface-2)] text-[14px]"
            >
              {a.icon}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-[15px] bg-[var(--surface-2)] p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.09em] text-[var(--text-faint)]">
        {icon}
        {label}
      </div>
      <div className="num mt-1 text-[17px] font-bold">{value}</div>
    </div>
  );
}
