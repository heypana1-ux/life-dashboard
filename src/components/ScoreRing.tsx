"use client";

import { useId } from "react";
import { scoreColor } from "@/lib/score";

/** Circular Life Score gauge (0..100) with an accent-gradient stroke. */
export function ScoreRing({
  value,
  size = 190,
  stroke = 18,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const gid = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const color = scoreColor(value);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--grad-a)" />
            <stop offset="1" stopColor="var(--grad-b)" />
          </linearGradient>
        </defs>
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
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .7s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="font-bold tabular-nums leading-none tracking-[-0.03em]"
          style={{ fontSize: size / 3.6 }}
        >
          {Math.round(value)}
        </span>
        {label && (
          <span className="mt-1 text-xs font-medium text-[var(--text-muted)]">{label}</span>
        )}
        {sublabel && (
          <span className="mt-1.5 text-[13px] font-semibold" style={{ color }}>
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
    <div className="h-[7px] w-full overflow-hidden rounded-[6px] bg-[var(--ring-track)]">
      <div
        className="h-full rounded-[6px]"
        style={{
          width: `${Math.max(2, Math.min(100, value))}%`,
          background: color ?? scoreColor(value),
          transition: "width .6s ease",
        }}
      />
    </div>
  );
}
