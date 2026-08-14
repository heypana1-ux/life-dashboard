"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { Modal, inputCls } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { DEFAULT_SPORTS } from "@/lib/defaults";
import { sportKind, SportKind } from "@/lib/sports";

/*
  Grouped, searchable sport picker (replacing the native <datalist>, which forced the
  on-screen keyboard). Sports are grouped by kind; custom entries are allowed.
*/

const KIND_ORDER: SportKind[] = ["strength", "distance", "rounds", "generic"];
const KIND_LABEL: Record<SportKind, string> = {
  strength: "Strength",
  distance: "Cardio",
  rounds: "Combat",
  generic: "Other",
};

export function SportPicker({
  open,
  onClose,
  onSelect,
  current,
  extra = [],
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
  current?: string;
  extra?: string[];
}) {
  const t = useT();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const all = useMemo(() => Array.from(new Set([...DEFAULT_SPORTS, ...extra])), [extra]);

  function pick(name: string) {
    onSelect(name);
    setQ("");
    onClose();
  }

  const groups = KIND_ORDER.map((kind) => ({
    kind,
    items: all.filter((s) => sportKind(s) === kind && (!query || s.toLowerCase().includes(query))),
  })).filter((g) => g.items.length > 0);

  const exactMatch = all.some((s) => s.toLowerCase() === query);

  return (
    <Modal open={open} onClose={onClose} title={t("Choose sport")} wide>
      <div className="space-y-3">
        <div className="sticky top-0 z-10 -mt-1 bg-[var(--surface)] pb-1">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
            <input
              className={`${inputCls} pl-9`}
              placeholder={t("Search sports…")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {query && !exactMatch && (
          <button
            onClick={() => pick(q.trim())}
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-3 py-2.5 text-left text-sm hover:border-[var(--accent)]"
          >
            <Plus size={15} className="text-[var(--accent)]" />
            {t("Use")} “<span className="font-medium">{q.trim()}</span>”
          </button>
        )}

        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.kind}>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                {t(KIND_LABEL[g.kind])}
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {g.items.map((s) => {
                  const active = current?.toLowerCase() === s.toLowerCase();
                  return (
                    <button
                      key={s}
                      onClick={() => pick(s)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                        active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <span className="truncate">{s}</span>
                      {active && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/** Input-styled button that opens the sport picker. */
export function SportSelect({
  value,
  onChange,
  extra,
}: {
  value: string;
  onChange: (name: string) => void;
  extra?: string[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${inputCls} flex items-center justify-between text-left ${value ? "" : "text-[var(--text-faint)]"}`}
      >
        <span className="truncate">{value || t("Choose sport")}</span>
        <ChevronDown size={16} className="shrink-0 text-[var(--text-faint)]" />
      </button>
      <SportPicker open={open} onClose={() => setOpen(false)} onSelect={onChange} current={value} extra={extra} />
    </>
  );
}
