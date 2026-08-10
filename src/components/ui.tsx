"use client";

import React from "react";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Minus, X } from "lucide-react";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("card p-4 sm:p-5", className)} {...rest}>
      {children}
    </div>
  );
}

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
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>
      {action}
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
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">
        {children}
      </h2>
      {right}
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
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm",
        variant === "primary" &&
          "bg-[var(--accent)] text-white hover:opacity-90 shadow-sm",
        variant === "soft" &&
          "bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-105",
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
        "rounded-full px-3 py-1 text-xs font-medium transition",
        active
          ? "bg-[var(--accent)] text-white"
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
      {icon && <div className="mb-3 text-[var(--text-faint)]">{icon}</div>}
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
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={clsx(
          "card max-h-[92vh] w-full overflow-y-auto rounded-b-none rounded-t-2xl sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
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
        tone === "accent" && "bg-[var(--accent-soft)] text-[var(--accent)]",
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
