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
    <div className={clsx("card p-[22px] sm:px-6", className)} {...rest}>
      {children}
    </div>
  );
}

/** Sticky topbar carrying the screen title / subtitle and its primary action. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-5 mb-[18px] flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-5 py-[18px] sm:-mx-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-8">
      <div className="min-w-0 pr-24 sm:pr-0">
        <h1 className="truncate text-[21px] font-semibold tracking-[-0.025em]">{title}</h1>
        {subtitle && (
          <p className="mt-[3px] truncate text-[13px] text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="min-w-0 max-w-full">{action}</div>}
    </div>
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
    <div className="mb-4 flex items-center justify-between gap-2">
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
}: {
  value: number;
  suffix?: string;
  className?: string;
  /** invert=true means "down is good" (e.g. negative habits). */
  invert?: boolean;
}) {
  const rounded = Math.round(value * 10) / 10;
  const positive = rounded > 0;
  const neutral = rounded === 0;
  const good = neutral ? false : invert ? !positive : positive;
  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        neutral
          ? "text-[var(--text-faint)]"
          : good
            ? "text-[var(--good)]"
            : "text-[var(--bad)]",
        className,
      )}
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
        "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
        active
          ? "area-soft shadow-sm"
          : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-4"
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
        <div className="mb-4 flex items-center justify-between gap-2">
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
      <span className="mb-1 block text-sm font-medium text-[var(--text-muted)]">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--text-faint)]">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

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
        "relative h-6 w-11 rounded-full transition",
        checked ? "bg-[var(--accent)]" : "bg-[var(--surface-3)]",
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
          checked ? "left-[22px]" : "left-0.5",
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
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
        tone === "default" && "bg-[var(--surface-2)] text-[var(--text-muted)]",
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
