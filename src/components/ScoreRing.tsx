"use client";

import { scoreColor } from "@/lib/score";

/** Circular Life Score gauge (0..100). */
export function ScoreRing({
  value,
  size = 180,
  stroke = 14,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const color = scoreColor(value);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .7s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold tabular-nums" style={{ fontSize: size / 4 }}>
          {Math.round(value)}
        </span>
        {label && (
          <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
        )}
        {sublabel && (
          <span className="mt-0.5 text-xs font-semibold" style={{ color }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

/** Small linear meter for a category (0..100). */
export function Meter({ value, color }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--ring-track)]">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.max(2, Math.min(100, value))}%`,
          background: color ?? scoreColor(value),
        }}
      />
    </div>
  );
}
