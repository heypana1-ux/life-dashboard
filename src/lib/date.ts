/** Date helpers working purely on local calendar dates (YYYY-MM-DD). */

/** Hour before which the "current day" still counts as the previous calendar day.
 *  So logging at 00:30 (or checking your streak at 00:47) goes to the day you're
 *  still living, not to the one that just started at midnight. */
export const DAY_CUTOFF_HOUR = 4;

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local calendar date (YYYY-MM-DD). With NO argument, returns the *logical* current day:
 *  before DAY_CUTOFF_HOUR it is still yesterday. An explicit date is formatted as-is
 *  (so addDays/isoRange math is never shifted). */
export function todayISO(d?: Date): string {
  if (d) return fmtDate(d);
  const now = new Date();
  if (now.getHours() < DAY_CUTOFF_HOUR) {
    const shifted = new Date(now);
    shifted.setDate(shifted.getDate() - 1);
    return fmtDate(shifted);
  }
  return fmtDate(now);
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

/** Whole days from `a` to `b` (b − a). Negative if b is before a. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
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
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Whole years from a birth date (YYYY-MM-DD) to today. */
export function ageFrom(birthISO: string): number {
  const b = parseISO(birthISO);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
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
