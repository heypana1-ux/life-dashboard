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
}

/** Presentational public-profile card — used for your own preview and (later) other people's. */
export function ProfileView({ p }: { p: ProfileCardData }) {
  const t = useT();
  const initial = (p.displayName || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="card overflow-hidden !p-0">
      <div className="grad h-20 w-full" />
      <div className="px-5 pb-5">
        <div className="-mt-10 flex items-end gap-3">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--surface)] bg-[var(--surface-2)]">
            {p.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grad flex h-full w-full items-center justify-center text-2xl font-bold text-white">{initial}</div>
            )}
          </div>
          <div className="mb-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-lg font-bold">{p.displayName || t("Anonymous")}</h2>
              {p.badge && <span className="text-lg leading-none">{p.badge}</span>}
            </div>
            {p.title && <div className="text-xs font-medium text-[var(--accent)]">{p.title}</div>}
          </div>
          <span className="mb-1 shrink-0 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent)]">
            {t("Lvl")} {p.level}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label={t("Life Score")} value={p.overall != null && p.overall > 0 ? String(p.overall) : "—"} />
          <Stat label={t("Life Rating")} value={p.elo != null ? p.elo.toLocaleString() : "—"} icon={<Trophy size={13} />} />
          <Stat label={t("Streak")} value={p.streak != null ? `${p.streak}` : "—"} icon={<Flame size={13} />} />
        </div>

        {p.accents && p.accents.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">{t("Unlocked themes")}</div>
            <div className="flex flex-wrap gap-1.5">
              {p.accents.map((g, i) => (
                <span key={i} className="h-5 w-5 rounded-full ring-1 ring-[var(--border)]" style={{ background: g }} />
              ))}
            </div>
          </div>
        )}

        {p.achievements && p.achievements.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
              {t("Achievements")} · {p.achievements.length}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {p.achievements.slice(0, 24).map((a, i) => (
                <span key={i} title={a.title} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-lg">
                  {a.icon}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="tile p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
        {icon}
        {label}
      </div>
      <div className="num mt-0.5 text-base font-bold">{value}</div>
    </div>
  );
}
