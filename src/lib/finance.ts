import { Finances, Holding, Transaction } from "./types";
import { todayISO } from "./date";

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
