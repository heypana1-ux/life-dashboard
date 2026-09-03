"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Minus, X } from "lucide-react";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("card p-[18px]", className)} {...rest}>
      {children}
    </div>
  );
}

/** Sticky topbar carrying the screen title / subtitle and its primary action.
 *  The title renders as the page's area-accent gradient ("Pulse" headline); an optional kicker
 *  sits above it (small uppercase line, usually a real number from the data). */
export function PageHeader({
  title,
  lead,
  trail,
  subtitle,
  action,
  kicker,
}: {
  title: string;
  /** Optional plain-colour prefix before the gradient title, e.g. "Your" in "Your habits". */
  lead?: string;
  /** Optional plain-colour suffix after the gradient title, e.g. ", Pana" in "Good morning, Pana". */
  trail?: string;
  subtitle?: string;
  action?: React.ReactNode;
  kicker?: React.ReactNode;
}) {
  return (
    <div className="mb-[22px] pt-[22px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {kicker && <div className="kicker truncate">{kicker}</div>}
          <h1 className="mt-1.5 whitespace-nowrap text-[27px] font-semibold leading-[1.1] tracking-[-0.03em]">
            {lead && <span className="text-[var(--text)]">{lead} </span>}
            <span className="area-title">{title}</span>
            {trail && <span className="text-[var(--text)]">{trail}</span>}
          </h1>
        </div>
        {action && <div className="flex shrink-0 items-center gap-1.5 pt-1">{action}</div>}
      </div>
      {subtitle && (
        <p className="mt-2 text-[12.5px] leading-[1.45] text-[var(--text-faint)]">{subtitle}</p>
      )}
    </div>
  );
}

/** 34px icon-only header action, as used in the design's page headers.
 *  `primary` renders the area-gradient "+" button; otherwise a bordered surface button. */
export function HeaderAction({
  onClick,
  label,
  primary,
  children,
}: {
  onClick?: () => void;
  label: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[12px] transition",
        primary
          ? "area-grad shadow-[0_8px_20px_color-mix(in_srgb,var(--area-a)_35%,transparent)]"
          : "area-text border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--area-a)]",
      )}
    >
      {children}
    </button>
  );
}

/** In-card action pill (Redeem / Buy / Update my scores …): 12px radius, 11.5px/600.
 *  `primary` fills with the area gradient, `soft` uses the area wash, `locked` is a hairline. */
export function ActionPill({
  tone = "primary",
  onClick,
  disabled,
  children,
}: {
  tone?: "primary" | "soft" | "locked";
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const off = disabled || tone === "locked";
  return (
    <button
      disabled={off}
      onClick={onClick}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-[12px] px-[13px] py-2 text-[11.5px] font-semibold transition",
        off
          ? "border border-[var(--border)] text-[var(--text-dim)]"
          : tone === "soft"
            ? "area-soft"
            : "area-grad hover:opacity-90",
      )}
    >
      {children}
    </button>
  );
}

/** Labelled header pill (the design's "+ New" button): 13px radius, area gradient, 12px/600. */
export function HeaderPill({
  onClick,
  children,
  soft,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  /** Bordered surface variant for secondary header actions. */
  soft?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-[13px] px-[13px] py-[9px] text-[12px] font-semibold transition",
        soft
          ? "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--area-a)]"
          : "area-grad hover:opacity-90",
      )}
    >
      {children}
    </button>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-[13px] flex items-center justify-between gap-2">
      <h2 className="slabel">{children}</h2>
      {right}
    </div>
  );
}

/** Small stat tile: icon + label, big number, optional sub. */
export function StatTile({
  icon,
  label,
  value,
  sub,
  valueColor,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="tile flex flex-col gap-2 p-[16px] sm:px-[18px]">
      <div className="flex items-center gap-[7px] text-[var(--text-faint)]">
        {icon && <span className="flex text-[15px]">{icon}</span>}
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em]">{label}</span>
      </div>
      <div className="num text-[26px] font-bold tracking-[-0.02em]" style={{ color: valueColor }}>
        {value}
      </div>
      {sub !== undefined && <div className="text-xs text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}

/** Count-up animation for a number. Eases from the previous value to the new one on change,
 *  respecting prefers-reduced-motion (jumps instantly then). */
export function AnimatedNumber({
  value,
  duration = 750,
  format,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(to);
      fromRef.current = to;
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const n = Math.round(display);
  return <>{format ? format(n) : n.toLocaleString()}</>;
}

/** Segmented control (pill group on a surface-2 track); active = gradient fill. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-[11px] bg-[var(--surface-2)] p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "rounded-[9px] px-3 py-1.5 text-[13px] font-medium transition",
            value === o.value
              ? "grad text-white shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "soft" | "danger" | "outline";
  size?: "sm" | "md";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-[12px] font-medium transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm",
        variant === "primary" && "area-grad shadow-sm hover:opacity-90",
        variant === "soft" && "area-soft hover:brightness-105",
        variant === "ghost" &&
          "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
        variant === "outline" &&
          "border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
        variant === "danger" && "bg-[var(--bad)] text-white hover:opacity-90",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Delta({
  value,
  suffix = "",
  className,
  invert = false,
  pill = false,
}: {
  value: number;
  suffix?: string;
  className?: string;
  /** invert=true means "down is good" (e.g. negative habits). */
  invert?: boolean;
  /** Renders the design's tinted capsule instead of bare coloured text. */
  pill?: boolean;
}) {
  const rounded = Math.round(value * 10) / 10;
  const positive = rounded > 0;
  const neutral = rounded === 0;
  const good = neutral ? false : invert ? !positive : positive;
  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const tone = neutral ? "var(--text-faint)" : good ? "var(--good)" : "var(--bad)";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 font-semibold",
        pill ? "rounded-full px-2 py-[3px] text-[12px]" : "text-xs",
        className,
      )}
      style={{
        color: tone,
        background: pill ? `color-mix(in srgb, ${tone} 16%, transparent)` : undefined,
      }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {rounded > 0 ? "+" : ""}
      {rounded}
      {suffix}
    </span>
  );
}

export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-full px-[13px] py-[7px] text-[12px] transition",
        active
          ? "area-grad font-semibold"
          : "border border-[var(--border)] bg-[var(--surface)] font-medium text-[var(--text-muted)] hover:border-[var(--area-a)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-12 text-center">
      {icon && (
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--text-faint)]">
          {icon}
        </div>
      )}
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  headerRight,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  headerRight?: React.ReactNode;
}) {
  // Portal to <body>: modals must escape ancestors with a `transform` (e.g. the page's
  // fade-in animation), which would otherwise make `position: fixed` anchor to that box
  // instead of the viewport and push the sheet off-screen.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  // Only close when the press STARTED on the backdrop. Otherwise selecting text inside an
  // input and releasing the mouse over the backdrop would close the dialog mid-edit.
  const downOnBackdrop = useRef(false);
  if (!open || !mounted) return null;

  return createPortal(
    <div
      // Above every full-screen overlay (workout runner, Wrapped, command palette all sit at
      // 80): a dialog opened from inside one of those has to land on top of it, not behind.
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-4"
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && downOnBackdrop.current) onClose();
      }}
    >
      <div
        className={clsx(
          // `dvh` shrinks with the on-screen keyboard, so inputs stay reachable on mobile.
          "card max-h-[88dvh] w-full overflow-y-auto overscroll-contain rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-[13px] flex items-center justify-between gap-2">
          <h3 className="min-w-0 truncate text-lg font-semibold">{title}</h3>
          <div className="flex shrink-0 items-center gap-1">
            {headerRight}
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X size={18} />
            </Button>
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block${className ? ` ${className}` : ""}`}>
      <span className="mb-1 block text-[11.5px] font-medium text-[var(--text-faint)]">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--text-faint)]">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[13px] outline-none transition focus:border-[var(--accent)]";

/**
 * A number input that can actually be cleared. A plain controlled `<input type="number">`
 * bound to a numeric state snaps back to 0 the moment you delete the last digit; this keeps
 * the field's own text so it can be empty while typing, and reports `number | undefined`.
 * For required fields, ignore `undefined` in your handler to keep the previous value.
 */
export function NumberInput({
  value,
  onChange,
  className,
  ...rest
}: {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const focused = useRef(false);
  useEffect(() => {
    // Sync from the outside only when the parsed text really differs (and never mid-typing),
    // so a parent that clamps/ignores our value can't fight what the user is entering.
    if (focused.current) return;
    const parsed = text === "" ? undefined : Number(text);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (value !== parsed) setText(value == null ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      className={className ?? inputCls}
      value={text}
      onFocus={() => (focused.current = true)}
      onBlur={() => (focused.current = false)}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        onChange(raw === "" ? undefined : Number(raw));
      }}
      {...rest}
    />
  );
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-[22px] w-[38px] shrink-0 rounded-full transition",
        checked ? "area-grad" : "border border-[var(--border)] bg-[var(--surface-2)]",
      )}
    >
      <span
        className={clsx(
          "absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition",
          checked ? "left-[19px]" : "left-[3px] bg-[var(--text-dim)]",
        )}
      />
    </button>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad" | "accent";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
        tone === "default" && "grad-soft text-[var(--text-muted)]",
        tone === "good" && "bg-[var(--good-soft)] text-[var(--good)]",
        tone === "bad" && "bg-[var(--bad-soft)] text-[var(--bad)]",
        tone === "warn" && "bg-[var(--good-soft)] text-[var(--warn)]",
        tone === "accent" && "area-soft",
      )}
    >
      {children}
    </span>
  );
}

/** Numeric 1..10 selector used for reviews / sleep quality. */
export function ScaleInput({
  value,
  onChange,
  max = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={clsx(
            "h-9 w-9 rounded-lg text-sm font-medium transition",
            value === n
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/* ============================ Pulse building blocks ============================ */

/** A soft, area-tinted rounded icon tile. Pass a hex color (usually the item's area color). */
export function IconTile({
  color,
  size = 30,
  radius = 11,
  children,
}: {
  color?: string;
  size?: number;
  radius?: number;
  children: React.ReactNode;
}) {
  const c = color ?? "var(--area-a)";
  return (
    <span
      className="flex shrink-0 items-center justify-center"
      style={{
        height: size,
        width: size,
        borderRadius: radius,
        background: `linear-gradient(135deg, color-mix(in srgb, ${c} 32%, transparent), color-mix(in srgb, ${c} 8%, transparent))`,
        color: c,
      }}
    >
      {children}
    </span>
  );
}

/** The page's focus zone: a big metric on the background with an optional sublabel + progress. */
export function FocusZone({
  label,
  value,
  sub,
  subColor,
  progress,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  subColor?: string;
  progress?: number | null;
}) {
  return (
    <div>
      <div className="slabel">{label}</div>
      <div className="mt-2 flex items-end gap-3">
        <span className="num text-[62px] font-bold leading-[.86] tracking-[-0.05em]">{value}</span>
        {sub && (
          <span className="mb-2 text-[13px] font-semibold" style={subColor ? { color: subColor } : undefined}>
            {sub}
          </span>
        )}
      </div>
      {progress != null && (
        <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%`, background: "linear-gradient(90deg,var(--area-a),var(--area-b))", transition: "width .5s ease" }}
          />
        </div>
      )}
    </div>
  );
}

/** A hairline-bordered row of 2–4 stats (used under a focus zone). */
export function HairlineStats({
  items,
}: {
  items: { label: React.ReactNode; value: React.ReactNode; color?: string }[];
}) {
  return (
    <div
      className="mt-3.5 grid border-y border-[var(--surface-2)]"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          className={clsx("py-3", i > 0 && "pl-3", i < items.length - 1 && "border-r border-[var(--surface-2)] pr-3")}
        >
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">{it.label}</div>
          <div className="num mt-1 text-[20px] font-bold tracking-[-0.03em]" style={it.color ? { color: it.color } : undefined}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/** An uppercase section label with an optional right-side element (link, badge, count). */
export function SectionHead({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="slabel">{children}</h2>
      {right}
    </div>
  );
}

/** Labeled 1..max segment scale (Pulse) — numbered tiles, filled up to the value. */
export function SegmentScale({
  value,
  max = 10,
  onChange,
}: {
  value: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: max }).map((_, i) => {
        const on = i + 1 === value;
        return (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            className="flex h-[26px] flex-1 items-center justify-center rounded-lg text-[10.5px] font-semibold tabular-nums transition"
            style={{
              background: on ? "linear-gradient(135deg,var(--area-a),var(--area-b))" : "var(--surface-2)",
              color: on ? "var(--area-ink)" : "var(--text-dim)",
            }}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
