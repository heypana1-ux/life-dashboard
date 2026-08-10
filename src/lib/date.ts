/** Date helpers working purely on local calendar dates (YYYY-MM-DD). */

export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(iso: string): number {
  return parseISO(iso).getDay();
}

export function isoRange(endISO: string, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(addDays(endISO, -i));
  return out;
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WD_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MON = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function fmtShort(iso: string): string {
  const d = parseISO(iso);
  return `${MON[d.getMonth()]} ${d.getDate()}`;
}

export function fmtLong(iso: string): string {
  const d = parseISO(iso);
  return `${WD_LONG[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function weekdayLabel(n: number, long = false): string {
  return long ? WD_LONG[n] : WD[n];
}

export function monthLabel(n: number): string {
  return MON[n];
}

/** Format minutes as "7h 45min". */
export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

/** Parse "HH:MM" to minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes slept between bedTime and wakeTime (handles crossing midnight). */
export function sleepDurationMinutes(bed: string, wake: string, fallAsleep = 0): number {
  const b = timeToMinutes(bed);
  const w = timeToMinutes(wake);
  // If bedtime is in the evening, treat as previous day.
  let dur = w - b;
  if (dur <= 0) dur += 24 * 60;
  dur -= fallAsleep;
  return Math.max(0, dur);
}
