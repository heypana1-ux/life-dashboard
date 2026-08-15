import { Budget, Finances, Holding, RecurringTx, Transaction } from "./types";
import { todayISO } from "./date";

/** Expense-category totals for this month vs the previous month, sorted by this month desc. */
export interface CategoryDelta {
  category: string;
  now: number;
  prev: number;
  delta: number;
}
export function categoryComparison(txs: Transaction[], month: string): CategoryDelta[] {
  const prevMonth = shiftMonth(month, -1);
  const sum = (m: string) => {
    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== "expense" || monthKey(t.date) !== m) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return map;
  };
  const now = sum(month);
  const prev = sum(prevMonth);
  const cats = new Set([...now.keys(), ...prev.keys()]);
  return [...cats]
    .map((category) => {
      const n = Math.round(now.get(category) ?? 0);
      const p = Math.round(prev.get(category) ?? 0);
      return { category, now: n, prev: p, delta: n - p };
    })
    .sort((a, b) => b.now - a.now);
}

/** Sum of active recurring expense rules per month ("fixed costs"). */
export function fixedCostsMonthly(recurring: RecurringTx[]): { total: number; items: RecurringTx[] } {
  const items = recurring.filter((r) => r.active && r.type === "expense");
  return { total: Math.round(items.reduce((s, r) => s + r.amount, 0)), items };
}

/*
  Finance helpers. The market-data layer is intentionally modular: today it is a manual /
  mock provider (prices come from the user or a stub), and a real API provider can be
  dropped in later behind the same `MarketDataProvider` interface without touching the UI.
*/

export interface Quote {
  ticker: string;
  price: number;
  mock: boolean;
}

export interface MarketDataProvider {
  name: string;
  live: boolean;
  getQuote(ticker: string): Promise<Quote | null>;
}

/** Default provider: no live data configured. Returns nothing (UI keeps manual prices). */
export const manualProvider: MarketDataProvider = {
  name: "manual",
  live: false,
  async getQuote() {
    return null;
  },
};

export function holdingValue(h: Holding): number {
  return h.quantity * h.currentPrice;
}
export function holdingCost(h: Holding): number {
  return h.quantity * h.buyPrice;
}
export function holdingGain(h: Holding): number {
  return holdingValue(h) - holdingCost(h);
}
export function holdingGainPct(h: Holding): number {
  const cost = holdingCost(h);
  return cost > 0 ? (holdingGain(h) / cost) * 100 : 0;
}

export interface PortfolioSummary {
  value: number;
  cost: number;
  gain: number;
  gainPct: number;
  monthlyPlan: number;
  allocation: { name: string; value: number; pct: number; color: string }[];
  /** Herfindahl-style concentration 0..1 (higher = more concentrated). */
  concentration: number;
}

const ALLOC_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#16a34a",
  "#d97706",
  "#9333ea",
  "#db2777",
  "#0891b2",
  "#dc2626",
];

export function portfolioSummary(holdings: Holding[]): PortfolioSummary {
  const value = holdings.reduce((s, h) => s + holdingValue(h), 0);
  const cost = holdings.reduce((s, h) => s + holdingCost(h), 0);
  const gain = value - cost;
  const monthlyPlan = holdings.reduce((s, h) => s + (h.monthlyPlan ?? 0), 0);
  const allocation = holdings
    .map((h, i) => ({
      name: h.name,
      value: holdingValue(h),
      pct: value > 0 ? (holdingValue(h) / value) * 100 : 0,
      color: ALLOC_COLORS[i % ALLOC_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);
  const concentration = allocation.reduce((s, a) => s + (a.pct / 100) ** 2, 0);
  return {
    value: Math.round(value),
    cost: Math.round(cost),
    gain: Math.round(gain),
    gainPct: cost > 0 ? (gain / cost) * 100 : 0,
    monthlyPlan: Math.round(monthlyPlan),
    allocation,
    concentration,
  };
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export interface MonthlyBudget {
  income: number;
  expenses: number;
  net: number;
  savingsRate: number; // %
  byCategory: { category: string; amount: number }[];
}

export function budgetForMonth(txs: Transaction[], month: string): MonthlyBudget {
  const inMonth = txs.filter((t) => monthKey(t.date) === month);
  const income = inMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = inMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;
  const catMap = new Map<string, number>();
  for (const t of inMonth.filter((x) => x.type === "expense")) {
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
  }
  const byCategory = [...catMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  return {
    income: Math.round(income),
    expenses: Math.round(expenses),
    net: Math.round(net),
    savingsRate: income > 0 ? Math.round((net / income) * 100) : 0,
    byCategory,
  };
}

export function currentMonth(): string {
  return monthKey(todayISO());
}

/** Shift a YYYY-MM key by n months (n can be negative). */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Human month label, e.g. "August 2026", localized by the browser. */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  try {
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  } catch {
    return month;
  }
}

export interface BudgetLine {
  category: string;
  limit: number;
  spent: number;
  pct: number; // spent / limit * 100 (0 when no limit)
  over: boolean;
}

/** Merge budget limits with actual spend for a given month's category totals. */
export function budgetVsActual(
  budgets: Budget[],
  byCategory: { category: string; amount: number }[],
): BudgetLine[] {
  const spent = new Map(byCategory.map((c) => [c.category, c.amount]));
  const seen = new Set<string>();
  const lines: BudgetLine[] = budgets.map((b) => {
    seen.add(b.category);
    const s = spent.get(b.category) ?? 0;
    return {
      category: b.category,
      limit: b.limit,
      spent: s,
      pct: b.limit > 0 ? (s / b.limit) * 100 : 0,
      over: b.limit > 0 && s > b.limit,
    };
  });
  return lines.sort((a, b) => b.pct - a.pct);
}

/** Number of days in the month of a YYYY-MM key. */
function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export interface DueBooking {
  rule: RecurringTx;
  date: string; // the YYYY-MM-DD it should be booked on
}

/**
 * Work out which recurring rules are due to be booked as of `today`.
 * A rule is due for the current month once today's day-of-month has reached its
 * scheduled day (clamped to the month length), and it hasn't been booked yet this month.
 * Returns the bookings plus the rules with `lastBooked` advanced.
 */
export function dueRecurring(
  rules: RecurringTx[],
  today: string,
): { due: DueBooking[]; updatedRules: RecurringTx[] } {
  const month = monthKey(today);
  const todayDay = Number(today.slice(8, 10));
  const due: DueBooking[] = [];
  const updatedRules = rules.map((r) => {
    if (!r.active) return r;
    if (r.lastBooked === month) return r;
    const day = Math.min(r.dayOfMonth, daysInMonth(month));
    if (todayDay < day) return r; // not yet due this month
    const date = `${month}-${String(day).padStart(2, "0")}`;
    due.push({ rule: r, date });
    return { ...r, lastBooked: month };
  });
  return { due, updatedRules };
}

export function fmtMoney(n: number, currency = "EUR"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${Math.round(n).toLocaleString()} ${currency}`;
  }
}

export const EXPENSE_CATEGORIES = [
  "Groceries",
  "Restaurants",
  "Leisure",
  "Clothing",
  "Travel",
  "Transport",
  "Subscriptions",
  "Insurance",
  "Health",
  "Investments",
  "Other",
];

export const INCOME_CATEGORIES = ["Salary", "Side income", "Gift", "Refund", "Other"];

/** Total net worth already lives in the store (computeNetWorth); re-export a light view. */
export function financeTotals(f: Finances) {
  const assets = f.accounts.reduce((s, a) => s + a.value, 0);
  const invest = f.holdings.reduce((s, h) => s + holdingValue(h), 0);
  const debt = f.liabilities.reduce((s, l) => s + l.balance, 0);
  return {
    assets: Math.round(assets),
    invest: Math.round(invest),
    debt: Math.round(debt),
    netWorth: Math.round(assets + invest - debt),
  };
}
