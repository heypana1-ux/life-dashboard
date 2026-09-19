"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, Scale } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { explainDay, scoreLabel } from "@/lib/score";
import { addDays, fmtLong, todayISO } from "@/lib/date";
import { Card, SectionTitle, EmptyState } from "@/components/ui";

/*
  Where a day's Life Score came from, as a ledger.

  Each row says what it added and what it was holding and didn't deliver, and the pluses add up
  to the score itself — the arithmetic is `explainDay`, which shares computeDay's own weights,
  so this panel can never quietly disagree with the number on the dashboard.
*/

export function DayLedger() {
  const { data } = useStore();
  const t = useT();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const dateInput = useRef<HTMLInputElement>(null);

  const ex = useMemo(() => explainDay(data, date), [data, date]);
  const fmt = (n: number) => (n >= 0.05 ? n.toFixed(1) : "—");

  return (
    <Card>
      <SectionTitle right={<Scale size={16} className="text-[var(--text-faint)]" />}>
        {t("Where the score came from")}
      </SectionTitle>

      <div className="mb-3 flex items-center gap-1.5">
        <button
          onClick={() => setDate((d) => addDays(d, -1))}
          className="h-8 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 text-sm hover:border-[var(--accent)]"
          aria-label={t("Previous day")}
        >
          ‹
        </button>
        {/* Same pattern as Today's header: the input is click-through and the chip opens it,
            so a thumb aimed at an arrow can't land in the picker's wider touch target. */}
        <button
          type="button"
          onClick={() => {
            const el = dateInput.current;
            if (!el) return;
            if (typeof el.showPicker === "function") el.showPicker();
            else el.click();
          }}
          className="relative flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[12.5px] font-medium hover:border-[var(--accent)]"
        >
          <CalendarDays size={14} className="text-[var(--text-faint)]" />
          {fmtLong(date)}
          <input
            ref={dateInput}
            type="date"
            max={today}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="pointer-events-none absolute h-0 w-0 opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </button>
        <button
          onClick={() => setDate((d) => (d < today ? addDays(d, 1) : d))}
          disabled={date >= today}
          className="h-8 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 text-sm enabled:hover:border-[var(--accent)] disabled:opacity-40"
          aria-label={t("Next day")}
        >
          ›
        </button>
      </div>

      {ex.lines.length === 0 ? (
        <EmptyState icon={<Scale size={24} />} title={t("Nothing logged on this day")} />
      ) : (
        <>
          {ex.missWeight < 1 && (
            <p className="mb-2 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1.5 text-[11.5px] text-[var(--accent)]">
              {ex.missWeight === 0
                ? t("Holiday — a missed habit costs nothing here.")
                : t("Rest day — a missed habit costs a third of the usual.")}
            </p>
          )}
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
            <span />
            <span className="text-right">+</span>
            <span className="w-11 text-right">−</span>
          </div>
          <div className="mt-1 divide-y divide-[var(--surface-2)]">
            {ex.lines.map((l) => (
              <div key={l.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 py-1.5">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">{l.translate ? t(l.label) : l.label}</div>
                  {l.detail && (
                    <div className="text-[11px] text-[var(--text-faint)]">
                      {l.detailTranslate ? t(l.detail) : l.detail}
                    </div>
                  )}
                </div>
                <span className="num w-11 text-right text-[13px] font-semibold text-[var(--good)]">{fmt(l.plus)}</span>
                <span className="num w-11 text-right text-[13px] font-semibold text-[var(--bad)]">
                  {l.minus >= 0.05 ? `−${l.minus.toFixed(1)}` : "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-t-2 border-[var(--border)] pt-2">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
              {t("Total")}
            </span>
            <span className="num w-11 text-right text-[13px] font-bold text-[var(--good)]">{ex.plus.toFixed(1)}</span>
            <span className="num w-11 text-right text-[13px] font-bold text-[var(--bad)]">−{ex.minus.toFixed(1)}</span>
          </div>

          <div className="mt-3 flex items-baseline justify-between rounded-[14px] bg-[var(--surface-2)] px-3 py-2.5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">
                {t("Balance")}
              </div>
              <div className="text-[11.5px] text-[var(--text-muted)]">
                {ex.lifeScore ? t(scoreLabel(ex.lifeScore)) : t("No data yet")}
              </div>
            </div>
            <span className="num text-[26px] font-bold tabular-nums">{ex.lifeScore ?? "—"}</span>
          </div>
          <p className="mt-2 text-[10.5px] leading-[1.5] text-[var(--text-dim)]">
            {t("Rows are rounded to one decimal, so they can differ from the balance by a fraction.")}
          </p>
        </>
      )}
    </Card>
  );
}
