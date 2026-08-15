"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { fmtShort } from "@/lib/date";

const AXIS = "var(--text-faint)";
const GRID = "var(--border)";

type ChartRow = Record<string, string | number>;

interface TipPayload {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
  stroke?: string;
  fill?: string;
}
interface TipProps {
  active?: boolean;
  payload?: TipPayload[];
  label?: string | number;
  unit?: string;
}

function ChartTip({ active, payload, label, unit }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card !p-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-[var(--text-muted)]">
        {typeof label === "string" && label.includes("-") ? fmtShort(label) : label}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color || p.stroke || p.fill }}
          />
          <span className="text-[var(--text)]">
            {p.name}: <span className="font-semibold">{p.value}</span>
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendLine({
  data,
  dataKey = "value",
  color = "var(--accent)",
  height = 220,
  name = "Value",
  domain,
  unit,
}: {
  data: ChartRow[];
  dataKey?: string;
  color?: string;
  height?: number;
  name?: string;
  domain?: [number | "auto", number | "auto"];
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => (typeof v === "string" && v.includes("-") ? fmtShort(v) : v)}
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={domain ?? ["auto", "auto"]}
          width={40}
        />
        <Tooltip content={<ChartTip unit={unit} />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#g-${dataKey})`}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiLine({
  data,
  series,
  height = 260,
  domain,
}: {
  data: ChartRow[];
  series: { key: string; name: string; color: string }[];
  height?: number;
  domain?: [number | "auto", number | "auto"];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => (typeof v === "string" && v.includes("-") ? fmtShort(v) : v)}
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={domain ?? ["auto", "auto"]}
          width={40}
        />
        <Tooltip content={<ChartTip />} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MiniSpark({
  data,
  color = "var(--accent)",
  height = 40,
}: {
  data: { date: string; value: number }[];
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return <div style={{ height }} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Bars({
  data,
  dataKey = "value",
  color = "var(--accent)",
  height = 220,
  unit,
}: {
  data: ChartRow[];
  dataKey?: string;
  color?: string;
  height?: number;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<ChartTip unit={unit} />} cursor={{ fill: "var(--surface-2)" }} />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Theme-aware inline-SVG radar/spider chart (0..max per axis). Optionally overlays a
 *  previous snapshot for comparison. No external chart lib — full control, tiny footprint. */
export function RadarChart({
  axes,
  values,
  prev,
  max = 10,
  size = 260,
}: {
  axes: string[];
  values: number[];
  prev?: number[];
  max?: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 46;
  const n = axes.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, radius: number) => ({
    x: cx + Math.cos(angle(i)) * radius,
    y: cy + Math.sin(angle(i)) * radius,
  });
  const poly = (vals: number[]) =>
    vals
      .map((v, i) => {
        const p = point(i, (Math.max(0, Math.min(max, v)) / max) * r);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ");

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, margin: "0 auto", display: "block" }}>
      {rings.map((f) => (
        <polygon
          key={f}
          points={axes.map((_, i) => { const p = point(i, r * f); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      {axes.map((_, i) => {
        const p = point(i, r);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={1} />;
      })}
      {prev && (
        <polygon points={poly(prev)} fill="var(--text-faint)" fillOpacity={0.12} stroke="var(--text-faint)" strokeWidth={1.5} strokeDasharray="4 3" />
      )}
      <polygon points={poly(values)} fill="var(--accent)" fillOpacity={0.22} stroke="var(--accent)" strokeWidth={2} />
      {values.map((_, i) => { const p = point(i, (Math.max(0, Math.min(max, values[i])) / max) * r); return <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--accent)" />; })}
      {axes.map((label, i) => {
        const p = point(i, r + 18);
        const anchor = Math.abs(p.x - cx) < 8 ? "middle" : p.x > cx ? "start" : "end";
        return (
          <text key={i} x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="middle" fontSize={10.5} fill="var(--text-muted)">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

interface ScatterTipProps {
  active?: boolean;
  payload?: { payload?: { x: number; y: number } }[];
  xLabel: string;
  yLabel: string;
}

function ScatterTip({ active, payload, xLabel, yLabel }: ScatterTipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;
  return (
    <div className="card !p-2 text-xs shadow-lg">
      <div>{xLabel}: <span className="font-semibold">{p.x}</span></div>
      <div>{yLabel}: <span className="font-semibold">{p.y}</span></div>
    </div>
  );
}

export function ScatterCorrelation({
  points,
  line,
  xLabel,
  yLabel,
  height = 260,
}: {
  points: { x: number; y: number }[];
  line: { x1: number; y1: number; x2: number; y2: number } | null;
  xLabel: string;
  yLabel: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 16, bottom: 4, left: -14 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={["dataMin", "dataMax"]}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={44}
          domain={["dataMin", "dataMax"]}
        />
        <ZAxis range={[50, 50]} />
        <Tooltip content={<ScatterTip xLabel={xLabel} yLabel={yLabel} />} cursor={{ strokeDasharray: "3 3" }} />
        {line && (
          <ReferenceLine
            ifOverflow="extendDomain"
            segment={[
              { x: line.x1, y: line.y1 },
              { x: line.x2, y: line.y2 },
            ]}
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        )}
        <Scatter data={points} fill="var(--accent)" fillOpacity={0.65} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
