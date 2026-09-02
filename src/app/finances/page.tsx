"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Repeat, Trash2, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import {
  AssetCategory,
  Budget,
  FinanceAccount,
  Holding,
  HoldingKind,
  Liability,
  RecurringTx,
  SavingsGoal,
  Transaction,
} from "@/lib/types";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  budgetForMonth,
  budgetVsActual,
  categoryComparison,
  currentMonth,
  financeTotals,
  fixedCostsMonthly,
  fmtMoney,
  holdingGain,
  holdingGainPct,
  holdingValue,
  monthLabel,
  portfolioSummary,
  shiftMonth,
  subscriptionAudit,
} from "@/lib/finance";
import { todayISO, addDays } from "@/lib/date";
import {
  Card,
  PageHeader,
  SectionTitle,
  Button,
  Chip,
  Modal,
  Field,
  inputCls,
  NumberInput,
  EmptyState,
  Badge,
  Delta,
} from "@/components/ui";
import { TrendLine } from "@/components/charts";

type Tab = "overview" | "portfolio" | "budget";

export default function FinancesPage() {
  const { data, runRecurring } = useStore();
  const t = useT();
  const [tab, setTab] = useState<Tab>("overview");
  const cur = data.finances.currency;

  // Auto-book any due recurring transactions (rent, salary, subscriptions…).
  useEffect(() => {
    runRecurring();
  }, [runRecurring]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("Manual tracking")}
        title={t("Finances")}
        subtitle={t("Net worth, portfolio and budget. Values are entered manually.")}
      />

      <div className="flex gap-1.5">
        <Chip active={tab === "overview"} onClick={() => setTab("overview")}>
          {t("Overview")}
        </Chip>
        <Chip active={tab === "portfolio"} onClick={() => setTab("portfolio")}>
          {t("Portfolio")}
        </Chip>
        <Chip active={tab === "budget"} onClick={() => setTab("budget")}>
          {t("Budget")}
        </Chip>
      </div>

      {tab === "overview" && <Overview cur={cur} />}
      {tab === "portfolio" && <PortfolioTab cur={cur} />}
      {tab === "budget" && <BudgetTab cur={cur} />}

      <p className="pb-2 text-center text-[11px] text-[var(--text-faint)]">
        {t("Information, not investment advice.")}
      </p>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function Overview({ cur }: { cur: string }) {
  const { data, saveAccount, removeAccount, saveLiability, removeLiability } = useStore();
  const t = useT();
  const totals = financeTotals(data.finances);
  const [accModal, setAccModal] = useState(false);
  const [liaModal, setLiaModal] = useState(false);
  const [editAcc, setEditAcc] = useState<FinanceAccount | undefined>();
  const [editLia, setEditLia] = useState<Liability | undefined>();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("Net worth")} value={fmtMoney(totals.netWorth, cur)} big />
        <Stat label={t("Assets")} value={fmtMoney(totals.assets, cur)} />
        <Stat label={t("Investments value")} value={fmtMoney(totals.invest, cur)} />
        <Stat label={t("Liabilities")} value={fmtMoney(totals.debt, cur)} tone="bad" />
      </div>

      <NetWorthCard cur={cur} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle
            right={
              <Button variant="soft" size="sm" onClick={() => { setEditAcc(undefined); setAccModal(true); }}>
                <Plus size={14} /> {t("Add")}
              </Button>
            }
          >
            {t("Accounts")}
          </SectionTitle>
          {data.finances.accounts.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("No accounts yet")}</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.finances.accounts.map((a) => (
                <Row
                  key={a.id}
                  title={a.name}
                  subtitle={t(categoryLabel(a.category))}
                  value={fmtMoney(a.value, cur)}
                  onEdit={() => { setEditAcc(a); setAccModal(true); }}
                  onDelete={() => removeAccount(a.id)}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle
            right={
              <Button variant="soft" size="sm" onClick={() => { setEditLia(undefined); setLiaModal(true); }}>
                <Plus size={14} /> {t("Add")}
              </Button>
            }
          >
            {t("Liabilities")}
          </SectionTitle>
          {data.finances.liabilities.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("No accounts yet")}</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.finances.liabilities.map((l) => (
                <Row
                  key={l.id}
                  title={l.name}
                  subtitle={l.monthlyPayment ? `${t("Monthly payment")}: ${fmtMoney(l.monthlyPayment, cur)}` : undefined}
                  value={`− ${fmtMoney(l.balance, cur)}`}
                  valueTone="bad"
                  onEdit={() => { setEditLia(l); setLiaModal(true); }}
                  onDelete={() => removeLiability(l.id)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <SavingsGoalsCard cur={cur} />

      <AccountModal
        open={accModal}
        onClose={() => setAccModal(false)}
        editing={editAcc}
        onSave={(a) => { saveAccount(a); setAccModal(false); }}
      />
      <LiabilityModal
        open={liaModal}
        onClose={() => setLiaModal(false)}
        editing={editLia}
        onSave={(l) => { saveLiability(l); setLiaModal(false); }}
      />
    </div>
  );
}

/** Net-worth-over-time chart with a range selector and change-over-range delta. */
function NetWorthCard({ cur }: { cur: string }) {
  const { data } = useStore();
  const t = useT();
  const [range, setRange] = useState<"3m" | "1y" | "all">("all");

  const full = data.finances.history;
  const filtered = useMemo(() => {
    if (range === "all") return full;
    const days = range === "3m" ? 90 : 365;
    const cutoff = addDays(todayISO(), -days);
    return full.filter((p) => p.date >= cutoff);
  }, [full, range]);
  const history = filtered.map((p) => ({ date: p.date, value: p.value }));
  const change = filtered.length >= 2 ? filtered[filtered.length - 1].value - filtered[0].value : 0;

  return (
    <Card>
      <SectionTitle
        right={
          <div className="flex gap-1.5">
            <Chip active={range === "3m"} onClick={() => setRange("3m")}>{t("3M")}</Chip>
            <Chip active={range === "1y"} onClick={() => setRange("1y")}>{t("1Y")}</Chip>
            <Chip active={range === "all"} onClick={() => setRange("all")}>{t("All")}</Chip>
          </div>
        }
      >
        {t("Net worth over time")}
      </SectionTitle>
      {history.length >= 2 ? (
        <>
          <div className="mb-2 flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span>
              {range === "all" ? t("Since the start") : range === "1y" ? t("Past year") : t("Past 3 months")}:
            </span>
            <span className="font-semibold text-[var(--text)]">
              {change >= 0 ? "+" : "−"}
              {fmtMoney(Math.abs(change), cur)}
            </span>
            <Delta value={change} />
          </div>
          <TrendLine data={history} color="var(--good)" name={t("Net worth")} height={220} />
        </>
      ) : (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">
          {t("Not enough data in this range yet.")}
        </p>
      )}
    </Card>
  );
}

/* ---------------- Portfolio ---------------- */

function PortfolioTab({ cur }: { cur: string }) {
  const { data, saveHolding, removeHolding } = useStore();
  const t = useT();
  const s = useMemo(() => portfolioSummary(data.finances.holdings), [data.finances.holdings]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Holding | undefined>();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("Total value")} value={fmtMoney(s.value, cur)} big />
        <Stat label={t("Total invested")} value={fmtMoney(s.cost, cur)} />
        <Stat
          label={t("Total gain")}
          value={fmtMoney(s.gain, cur)}
          tone={s.gain >= 0 ? "good" : "bad"}
          extra={`${s.gainPct >= 0 ? "+" : ""}${s.gainPct.toFixed(1)}%`}
        />
        <Stat label={t("Monthly plan")} value={fmtMoney(s.monthlyPlan, cur)} />
      </div>

      <Card>
        <SectionTitle
          right={
            <Button variant="soft" size="sm" onClick={() => { setEditing(undefined); setModal(true); }}>
              <Plus size={14} /> {t("Add holding")}
            </Button>
          }
        >
          {t("Portfolio")}
        </SectionTitle>
        {data.finances.holdings.length === 0 ? (
          <EmptyState
            icon={<Wallet size={26} />}
            title={t("No holdings yet")}
            action={
              <Button variant="soft" size="sm" onClick={() => setModal(true)}>
                <Plus size={14} /> {t("Add holding")}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-faint)]">
                  <th className="pb-2 pr-3 font-medium">{t("Name")}</th>
                  <th className="pb-2 pr-3 text-right font-medium">{t("Quantity")}</th>
                  <th className="pb-2 pr-3 text-right font-medium">{t("Current price")}</th>
                  <th className="pb-2 pr-3 text-right font-medium">{t("Value")}</th>
                  <th className="pb-2 pr-3 text-right font-medium">{t("Gain / Loss")}</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {data.finances.holdings.map((h) => {
                  const g = holdingGain(h);
                  return (
                    <tr key={h.id} className="border-t border-[var(--border)]">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium">{h.name}</div>
                        <div className="text-xs text-[var(--text-faint)]">
                          {h.ticker ? h.ticker + " · " : ""}
                          {t(kindLabel(h.kind))}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{h.quantity}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{fmtMoney(h.currentPrice, cur)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums font-medium">{fmtMoney(holdingValue(h), cur)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        <span className={g >= 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}>
                          {g >= 0 ? "+" : ""}
                          {fmtMoney(g, cur)}
                        </span>
                        <div className="text-xs text-[var(--text-faint)]">
                          {holdingGainPct(h) >= 0 ? "+" : ""}
                          {holdingGainPct(h).toFixed(1)}%
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => { setEditing(h); setModal(true); }}
                          className="rounded-lg px-2 py-1 text-xs text-[var(--text-faint)] hover:bg-[var(--surface-2)]"
                        >
                          {t("Edit")}
                        </button>
                        <button
                          onClick={() => removeHolding(h.id)}
                          className="rounded-lg p-1.5 text-[var(--text-faint)] hover:text-[var(--bad)]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {s.allocation.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <SectionTitle>{t("Allocation")}</SectionTitle>
            <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full">
              {s.allocation.map((a) => (
                <div key={a.name} style={{ width: `${a.pct}%`, background: a.color }} title={a.name} />
              ))}
            </div>
            <div className="space-y-1.5">
              {s.allocation.map((a) => (
                <div key={a.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                    {a.name}
                  </span>
                  <span className="tabular-nums text-[var(--text-muted)]">{a.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle right={<Badge tone="accent">{t("Data-driven")}</Badge>}>
              {t("Diversification")}
            </SectionTitle>
            <p className="text-sm">
              {s.concentration > 0.5
                ? t("Concentrated — one position dominates")
                : t("Well diversified")}
            </p>
            <p className="mt-2 text-xs text-[var(--text-faint)]">
              {t("Market prices are entered manually. A live-data provider can be added later without changing this screen.")}
            </p>
          </Card>
        </div>
      )}

      <HoldingModal
        open={modal}
        onClose={() => setModal(false)}
        editing={editing}
        onSave={(h) => { saveHolding(h); setModal(false); }}
      />
    </div>
  );
}

/* ---------------- Budget ---------------- */

function BudgetTab({ cur }: { cur: string }) {
  const { data, saveTransaction, removeTransaction, saveBudget, removeBudget } = useStore();
  const t = useT();
  const [month, setMonth] = useState(currentMonth());
  const [modal, setModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const b = useMemo(
    () => budgetForMonth(data.finances.transactions, month),
    [data.finances.transactions, month],
  );
  const budgetLines = useMemo(
    () => budgetVsActual(data.finances.budgets, b.byCategory),
    [data.finances.budgets, b.byCategory],
  );
  const totalBudget = data.finances.budgets.reduce((s, x) => s + x.limit, 0);
  const comparison = useMemo(() => categoryComparison(data.finances.transactions, month), [data.finances.transactions, month]);
  const fixed = useMemo(() => fixedCostsMonthly(data.finances.recurring), [data.finances.recurring]);

  const monthTxs = data.finances.transactions
    .filter((x) => x.date.slice(0, 7) === month)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const isCurrent = month === currentMonth();

  return (
    <div className="space-y-4">
      {/* Month switcher */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
          aria-label={t("Previous month")}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-[9rem] text-center text-sm font-semibold">{monthLabel(month)}</div>
        <button
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          disabled={isCurrent}
          className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] disabled:opacity-30"
          aria-label={t("Next month")}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("Monthly income")} value={fmtMoney(b.income, cur)} tone="good" />
        <Stat label={t("Monthly expenses")} value={fmtMoney(b.expenses, cur)} tone="bad" />
        <Stat label={t("Balance")} value={fmtMoney(b.net, cur)} tone={b.net >= 0 ? "good" : "bad"} />
        <Stat label={t("Savings rate")} value={`${b.savingsRate}%`} big />
      </div>

      {/* Quick add */}
      <QuickAdd cur={cur} month={month} onSave={saveTransaction} onMore={() => { setEditTx(undefined); setModal(true); }} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle
            right={
              <Button variant="soft" size="sm" onClick={() => { setEditTx(undefined); setModal(true); }}>
                <Plus size={14} /> {t("Add")}
              </Button>
            }
          >
            {t("Transactions")}
          </SectionTitle>
          {monthTxs.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("No transactions yet")}</p>
          ) : (
            <div className="max-h-96 divide-y divide-[var(--border)] overflow-y-auto">
              {monthTxs.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => { setEditTx(tx); setModal(true); }}
                  className="flex w-full items-center justify-between py-2.5 text-left hover:bg-[var(--surface-2)]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t(categoryLabel(tx.category))}</div>
                    <div className="truncate text-xs text-[var(--text-faint)]">
                      {tx.date}
                      {tx.note ? ` · ${tx.note}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        tx.type === "income" ? "text-[var(--good)]" : "text-[var(--bad)]"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "−"}
                      {fmtMoney(tx.amount, cur)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); removeTransaction(tx.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); removeTransaction(tx.id); } }}
                      className="text-[var(--text-faint)] hover:text-[var(--bad)]"
                    >
                      <Trash2 size={14} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>{t("Expenses by category")}</SectionTitle>
          {b.byCategory.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("No transactions yet")}</p>
          ) : (
            <div className="space-y-2">
              {b.byCategory.map((c) => {
                const pct = b.expenses > 0 ? (c.amount / b.expenses) * 100 : 0;
                return (
                  <div key={c.category}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{t(categoryLabel(c.category))}</span>
                      <span className="tabular-nums text-[var(--text-muted)]">
                        {fmtMoney(c.amount, cur)} · {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--ring-track)]">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* This vs last month + fixed costs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>{t("This vs. last month")}</SectionTitle>
          {comparison.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("No transactions yet")}</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {comparison.slice(0, 8).map((c) => (
                <div key={c.category} className="flex items-center justify-between py-2 text-sm">
                  <span>{t(categoryLabel(c.category))}</span>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="font-medium">{fmtMoney(c.now, cur)}</span>
                    {c.prev > 0 && (
                      <span className={`text-xs ${c.delta > 0 ? "text-[var(--bad)]" : c.delta < 0 ? "text-[var(--good)]" : "text-[var(--text-faint)]"}`}>
                        {c.delta > 0 ? "▲" : c.delta < 0 ? "▼" : "="} {fmtMoney(Math.abs(c.delta), cur)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle right={<Repeat size={16} className="text-[var(--text-faint)]" />}>{t("Fixed costs")}</SectionTitle>
          {fixed.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">
              {t("Add recurring expenses to see your monthly fixed costs.")}
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="num text-2xl font-bold">{fmtMoney(fixed.total, cur)}</span>
                <span className="text-xs text-[var(--text-muted)]">/ {t("month")}</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {fixed.items.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span>{t(categoryLabel(r.category))}{r.note ? ` · ${r.note}` : ""}</span>
                    <span className="tabular-nums text-[var(--text-muted)]">{fmtMoney(r.amount, cur)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Budget vs actual */}
      <Card>
        <SectionTitle
          right={
            <Button variant="soft" size="sm" onClick={() => setBudgetOpen(true)}>
              <Plus size={14} /> {t("Set budgets")}
            </Button>
          }
        >
          {t("Budget vs. actual")}
        </SectionTitle>
        {budgetLines.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            {t("Set a monthly limit per category to track how you're doing.")}
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {budgetLines.map((l) => (
                <div key={l.category}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {t(categoryLabel(l.category))}
                      {l.over && <Badge tone="bad">{t("Over budget")}</Badge>}
                    </span>
                    <span className="tabular-nums text-[var(--text-muted)]">
                      {fmtMoney(l.spent, cur)} / {fmtMoney(l.limit, cur)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--ring-track)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(l.pct, 100)}%`,
                        background: l.over ? "var(--bad)" : l.pct > 80 ? "var(--warn)" : "var(--good)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {totalBudget > 0 && (
              <p className="mt-3 text-xs text-[var(--text-faint)]">
                {t("Total budgeted")}: {fmtMoney(totalBudget, cur)} · {t("spent")} {fmtMoney(b.expenses, cur)}
              </p>
            )}
          </>
        )}
      </Card>

      {/* Recurring */}
      <Card>
        <SectionTitle
          right={
            <Button variant="soft" size="sm" onClick={() => setRecurringOpen(true)}>
              <Repeat size={14} /> {t("Manage")}
            </Button>
          }
        >
          {t("Recurring")}
        </SectionTitle>
        {data.finances.recurring.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            {t("Add rent, salary or subscriptions to book them automatically each month.")}
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {data.finances.recurring.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {t(categoryLabel(r.category))}
                    {!r.active && <span className="ml-2 text-xs text-[var(--text-faint)]">({t("paused")})</span>}
                  </div>
                  <div className="text-xs text-[var(--text-faint)]">
                    {t("Day")} {r.dayOfMonth}
                    {r.note ? ` · ${r.note}` : ""}
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    r.type === "income" ? "text-[var(--good)]" : "text-[var(--bad)]"
                  }`}
                >
                  {r.type === "income" ? "+" : "−"}
                  {fmtMoney(r.amount, cur)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SubscriptionAuditCard cur={cur} />

      <TransactionModal
        open={modal}
        onClose={() => setModal(false)}
        editing={editTx}
        defaultDate={isCurrent ? undefined : `${month}-01`}
        onSave={(tx) => { saveTransaction(tx); setModal(false); }}
      />
      <BudgetModal
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        budgets={data.finances.budgets}
        onSave={saveBudget}
        onRemove={removeBudget}
      />
      <RecurringModal open={recurringOpen} onClose={() => setRecurringOpen(false)} />
    </div>
  );
}

/* Fast one-tap entry: type toggle, amount, category chips. */
function QuickAdd({
  cur,
  month,
  onSave,
  onMore,
}: {
  cur: string;
  month: string;
  onSave: (t: Transaction) => void;
  onMore: () => void;
}) {
  const t = useT();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Groceries");
  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    // Book on today if the visible month is the current one, else on the 1st of that month.
    const date = month === currentMonth() ? todayISO() : `${month}-01`;
    onSave({ id: "", date, type, category, amount: amt });
    setAmount("");
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-xl border border-[var(--border)]">
          {(["expense", "income"] as const).map((ty) => (
            <button
              key={ty}
              onClick={() => { setType(ty); setCategory(ty === "income" ? "Salary" : "Groceries"); }}
              className={`px-3 py-2 text-sm font-medium ${
                type === ty
                  ? ty === "income"
                    ? "bg-[var(--good)] text-white"
                    : "bg-[var(--bad)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--text-muted)]"
              }`}
            >
              {ty === "income" ? t("Income") : t("Expense")}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            placeholder={`${t("Amount")} (${cur})`}
            className={`${inputCls} flex-1`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
          <Button onClick={submit} disabled={!amount || Number(amount) <= 0}>
            <Plus size={16} /> {t("Add")}
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              category === c
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]"
            }`}
          >
            {t(categoryLabel(c))}
          </button>
        ))}
        <button
          onClick={onMore}
          className="rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-faint)] hover:text-[var(--text)]"
        >
          {t("More options")}
        </button>
      </div>
    </Card>
  );
}

/* ---------------- Subscription audit ---------------- */

function SubscriptionAuditCard({ cur }: { cur: string }) {
  const { data, saveRecurring } = useStore();
  const t = useT();
  const audit = useMemo(() => subscriptionAudit(data.finances.recurring), [data.finances.recurring]);

  return (
    <Card>
      <SectionTitle right={<Repeat size={16} className="text-[var(--text-faint)]" />}>{t("Subscription audit")}</SectionTitle>
      {audit.items.length === 0 ? (
        <EmptyState
          icon={<Repeat size={26} />}
          title={t("No subscriptions tracked")}
          hint={t("Add recurring expenses (Netflix, gym, insurance…) to see what they cost you per year.")}
        />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="tile p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">{t("Active / month")}</div>
              <div className="num mt-0.5 text-xl font-bold">{fmtMoney(audit.monthlyActive, cur)}</div>
            </div>
            <div className="tile p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">{t("Active / year")}</div>
              <div className="num mt-0.5 text-xl font-bold text-[var(--bad)]">{fmtMoney(audit.yearlyActive, cur)}</div>
            </div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {audit.items.map((s) => (
              <div key={s.id} className={`flex items-center justify-between py-2.5 ${s.active ? "" : "opacity-55"}`}>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {t(categoryLabel(s.category))}{s.note ? ` · ${s.note}` : ""}
                  </div>
                  <div className="text-xs text-[var(--text-faint)]">
                    {fmtMoney(s.monthly, cur)}/{t("mo")} · <span className="font-medium">{fmtMoney(s.yearly, cur)}/{t("yr")}</span>
                  </div>
                </div>
                <button
                  onClick={() => saveRecurring({ ...data.finances.recurring.find((r) => r.id === s.id)!, active: !s.active })}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${s.active ? "text-[var(--good)] hover:bg-[var(--surface-2)]" : "text-[var(--text-faint)] hover:bg-[var(--surface-2)]"}`}
                >
                  {s.active ? t("Active") : t("Cancelled")}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[var(--text-faint)]">
            {t("Tip: mark a subscription Cancelled to remove it from your totals without deleting the rule.")}
          </p>
        </>
      )}
    </Card>
  );
}

/* ---------------- Savings goals ---------------- */

function SavingsGoalsCard({ cur }: { cur: string }) {
  const { data, saveSavingsGoal, removeSavingsGoal } = useStore();
  const t = useT();
  const goals = data.finances.savingsGoals;
  const [modal, setModal] = useState(false);

  return (
    <Card>
      <SectionTitle
        right={
          <Button variant="soft" size="sm" onClick={() => setModal(true)}>
            <Plus size={14} /> {t("Add goal")}
          </Button>
        }
      >
        {t("Savings goals")}
      </SectionTitle>
      {goals.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--text-muted)]">
          {t("Track a savings target like an emergency fund or a trip.")}
        </p>
      ) : (
        <div className="space-y-4">
          {goals.map((g) => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
            const done = g.current >= g.target && g.target > 0;
            return (
              <div key={g.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{g.name}</span>
                  <span className="tabular-nums text-[var(--text-muted)]">
                    {fmtMoney(g.current, cur)} / {fmtMoney(g.target, cur)}
                    <button onClick={() => removeSavingsGoal(g.id)} className="ml-2 text-[var(--text-faint)] hover:text-[var(--bad)]" aria-label={t("Delete")}>
                      <Trash2 size={13} className="inline" />
                    </button>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--ring-track)]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: done ? "var(--good)" : "var(--accent)" }} />
                  </div>
                  <span className="w-9 text-right text-xs tabular-nums text-[var(--text-faint)]">{pct}%</span>
                  <button
                    onClick={() => saveSavingsGoal({ ...g, current: g.current + 50 })}
                    className="rounded-lg bg-[var(--surface-2)] px-2 py-1 text-xs font-medium hover:bg-[var(--surface-3)]"
                  >
                    +50
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <SavingsGoalModal open={modal} onClose={() => setModal(false)} onSave={(g) => { saveSavingsGoal(g); setModal(false); }} />
    </Card>
  );
}

function SavingsGoalModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (g: SavingsGoal) => void }) {
  const t = useT();
  const blank = (): SavingsGoal => ({ id: "", name: "", target: 0, current: 0 });
  const [draft, setDraft] = useState<SavingsGoal>(blank());
  const [lk, setLk] = useState(false);
  if (open && !lk) { setLk(true); setDraft(blank()); }
  if (!open && lk) setLk(false);
  return (
    <Modal open={open} onClose={onClose} title={t("Add goal")}>
      <div className="space-y-4">
        <Field label={t("Name")}>
          <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Target")}>
            <NumberInput value={draft.target || undefined} onChange={(n) => setDraft({ ...draft, target: n ?? 0 })} />
          </Field>
          <Field label={t("Saved so far")}>
            <NumberInput value={draft.current || undefined} onChange={(n) => setDraft({ ...draft, current: n ?? 0 })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button onClick={() => draft.name.trim() && draft.target > 0 && onSave(draft)} disabled={!draft.name.trim() || draft.target <= 0}>{t("Save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Shared bits ---------------- */

function Stat({
  label,
  value,
  big,
  tone,
  extra,
}: {
  label: string;
  value: string;
  big?: boolean;
  tone?: "good" | "bad";
  extra?: string;
}) {
  return (
    <Card className="!p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{label}</div>
      <div
        className={`mt-1 font-bold tabular-nums ${big ? "text-2xl" : "text-xl"} ${
          tone === "good" ? "text-[var(--good)]" : tone === "bad" ? "text-[var(--bad)]" : ""
        }`}
      >
        {value}
      </div>
      {extra && <div className="text-xs text-[var(--text-muted)]">{extra}</div>}
    </Card>
  );
}

function Row({
  title,
  subtitle,
  value,
  valueTone,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  value: string;
  valueTone?: "bad";
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="text-xs text-[var(--text-faint)]">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold tabular-nums ${valueTone === "bad" ? "text-[var(--bad)]" : ""}`}>
          {value}
        </span>
        <button onClick={onEdit} className="rounded-lg px-2 py-1 text-xs text-[var(--text-faint)] hover:bg-[var(--surface-2)]">
          ✎
        </button>
        <button onClick={onDelete} className="text-[var(--text-faint)] hover:text-[var(--bad)]">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function categoryLabel(c: string): string {
  return c;
}
function kindLabel(k: HoldingKind): string {
  return k.charAt(0).toUpperCase() + k.slice(1);
}

/* ---------------- Modals ---------------- */

const ASSET_CATS: AssetCategory[] = ["bank", "cash", "investment", "realestate", "vehicle", "other"];

function AccountModal({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing?: FinanceAccount;
  onSave: (a: FinanceAccount) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<FinanceAccount>(
    editing ?? { id: "", name: "", category: "bank", value: 0 },
  );
  const key = editing?.id ?? "new";
  const [lk, setLk] = useState(key);
  if (open && key !== lk) {
    setLk(key);
    setDraft(editing ?? { id: "", name: "", category: "bank", value: 0 });
  }
  return (
    <Modal open={open} onClose={onClose} title={editing ? t("Edit") : t("Add account")}>
      <div className="space-y-4">
        <Field label={t("Name")}>
          <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Category")}>
            <select className={inputCls} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as AssetCategory })}>
              {ASSET_CATS.map((c) => (
                <option key={c} value={c}>{t(c.charAt(0).toUpperCase() + c.slice(1))}</option>
              ))}
            </select>
          </Field>
          <Field label={t("Value")}>
            <NumberInput value={draft.value} onChange={(n) => setDraft({ ...draft, value: n ?? 0 })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button onClick={() => draft.name.trim() && onSave(draft)} disabled={!draft.name.trim()}>{t("Save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function LiabilityModal({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Liability;
  onSave: (l: Liability) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<Liability>(editing ?? { id: "", name: "", balance: 0 });
  const key = editing?.id ?? "new";
  const [lk, setLk] = useState(key);
  if (open && key !== lk) {
    setLk(key);
    setDraft(editing ?? { id: "", name: "", balance: 0 });
  }
  return (
    <Modal open={open} onClose={onClose} title={editing ? t("Edit") : t("Add liability")}>
      <div className="space-y-4">
        <Field label={t("Name")}>
          <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Balance")}>
            <NumberInput value={draft.balance} onChange={(n) => setDraft({ ...draft, balance: n ?? 0 })} />
          </Field>
          <Field label={t("Monthly payment")}>
            <input type="number" className={inputCls} value={draft.monthlyPayment ?? ""} onChange={(e) => setDraft({ ...draft, monthlyPayment: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button onClick={() => draft.name.trim() && onSave(draft)} disabled={!draft.name.trim()}>{t("Save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

const HOLDING_KINDS: HoldingKind[] = ["stock", "etf", "fund", "crypto", "bond", "other"];

function HoldingModal({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Holding;
  onSave: (h: Holding) => void;
}) {
  const t = useT();
  const blank: Holding = { id: "", name: "", kind: "stock", quantity: 0, buyPrice: 0, currentPrice: 0 };
  const [draft, setDraft] = useState<Holding>(editing ?? blank);
  const key = editing?.id ?? "new";
  const [lk, setLk] = useState(key);
  if (open && key !== lk) {
    setLk(key);
    setDraft(editing ?? blank);
  }
  return (
    <Modal open={open} onClose={onClose} title={editing ? t("Edit") : t("Add holding")} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Name")}>
            <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
          </Field>
          <Field label={t("Ticker")}>
            <input className={inputCls} value={draft.ticker ?? ""} onChange={(e) => setDraft({ ...draft, ticker: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Type")}>
            <select className={inputCls} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as HoldingKind })}>
              {HOLDING_KINDS.map((k) => (
                <option key={k} value={k}>{t(kindLabel(k))}</option>
              ))}
            </select>
          </Field>
          <Field label={t("Quantity")}>
            <NumberInput value={draft.quantity} onChange={(n) => setDraft({ ...draft, quantity: n ?? 0 })} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("Buy price")}>
            <NumberInput value={draft.buyPrice} onChange={(n) => setDraft({ ...draft, buyPrice: n ?? 0 })} />
          </Field>
          <Field label={t("Current price")}>
            <NumberInput value={draft.currentPrice} onChange={(n) => setDraft({ ...draft, currentPrice: n ?? 0 })} />
          </Field>
          <Field label={t("Monthly plan")}>
            <input type="number" className={inputCls} value={draft.monthlyPlan ?? ""} onChange={(e) => setDraft({ ...draft, monthlyPlan: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button onClick={() => draft.name.trim() && onSave(draft)} disabled={!draft.name.trim()}>{t("Save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function TransactionModal({
  open,
  onClose,
  onSave,
  editing,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (t: Transaction) => void;
  editing?: Transaction;
  defaultDate?: string;
}) {
  const t = useT();
  const blank = (): Transaction => ({
    id: "",
    date: defaultDate ?? todayISO(),
    type: "expense",
    category: "Groceries",
    amount: 0,
  });
  const [draft, setDraft] = useState<Transaction>(editing ?? blank());
  const key = editing?.id ?? "new";
  const [lk, setLk] = useState(key);
  if (open && key !== lk) {
    setLk(key);
    setDraft(editing ?? blank());
  }
  const cats = draft.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return (
    <Modal open={open} onClose={onClose} title={editing ? t("Edit transaction") : t("Add transaction")}>
      <div className="space-y-4">
        <div className="flex gap-2">
          {(["expense", "income"] as const).map((ty) => (
            <button
              key={ty}
              onClick={() => setDraft({ ...draft, type: ty, category: ty === "income" ? "Salary" : "Groceries" })}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                draft.type === ty ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-2)]"
              }`}
            >
              {ty === "income" ? t("Income") : t("Expense")}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Amount")}>
            <NumberInput value={draft.amount || undefined} onChange={(n) => setDraft({ ...draft, amount: n ?? 0 })} autoFocus />
          </Field>
          <Field label={t("Date")}>
            <input type="date" className={inputCls} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </Field>
        </div>
        <Field label={t("Category")}>
          <select className={inputCls} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            {cats.map((c) => (
              <option key={c} value={c}>{t(categoryLabel(c))}</option>
            ))}
          </select>
        </Field>
        <Field label={t("Note")}>
          <input className={inputCls} value={draft.note ?? ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button onClick={() => draft.amount > 0 && onSave(draft)} disabled={draft.amount <= 0}>{t("Save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function BudgetModal({
  open,
  onClose,
  budgets,
  onSave,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  budgets: Budget[];
  onSave: (b: Budget) => void;
  onRemove: (category: string) => void;
}) {
  const t = useT();
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [limit, setLimit] = useState("");

  function add() {
    const n = Number(limit);
    if (!n || n <= 0) return;
    onSave({ category, limit: n });
    setLimit("");
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Monthly budgets")}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          {t("Set a spending limit per category. You'll see how much of each you've used this month.")}
        </p>
        <div className="flex items-end gap-2">
          <Field label={t("Category")} className="flex-1">
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(categoryLabel(c))}</option>
              ))}
            </select>
          </Field>
          <Field label={t("Limit")} className="w-28">
            <input type="number" className={inputCls} value={limit} onChange={(e) => setLimit(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          </Field>
          <Button onClick={add} disabled={!limit || Number(limit) <= 0}>{t("Set")}</Button>
        </div>
        {budgets.length > 0 && (
          <div className="divide-y divide-[var(--border)]">
            {budgets.map((bd) => (
              <div key={bd.category} className="flex items-center justify-between py-2">
                <span className="text-sm">{t(categoryLabel(bd.category))}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums">{bd.limit}</span>
                  <button onClick={() => onRemove(bd.category)} className="text-[var(--text-faint)] hover:text-[var(--bad)]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>{t("Done")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function RecurringModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { data, saveRecurring, removeRecurring } = useStore();
  const blank = (): RecurringTx => ({
    id: "",
    type: "expense",
    category: "Subscriptions",
    amount: 0,
    dayOfMonth: 1,
    active: true,
  });
  const [draft, setDraft] = useState<RecurringTx>(blank());
  const cats = draft.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function add() {
    if (draft.amount <= 0) return;
    saveRecurring(draft);
    setDraft(blank());
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Recurring transactions")} wide>
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          {t("These are booked automatically each month when their day arrives, while the app is open.")}
        </p>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="flex gap-2">
            {(["expense", "income"] as const).map((ty) => (
              <button
                key={ty}
                onClick={() => setDraft({ ...draft, type: ty, category: ty === "income" ? "Salary" : "Subscriptions" })}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                  draft.type === ty ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-2)]"
                }`}
              >
                {ty === "income" ? t("Income") : t("Expense")}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label={t("Amount")}>
              <NumberInput value={draft.amount || undefined} onChange={(n) => setDraft({ ...draft, amount: n ?? 0 })} />
            </Field>
            <Field label={t("Day of month")}>
              <input type="number" min={1} max={31} className={inputCls} value={draft.dayOfMonth} onChange={(e) => setDraft({ ...draft, dayOfMonth: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })} />
            </Field>
            <Field label={t("Category")}>
              <select className={inputCls} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {cats.map((c) => (
                  <option key={c} value={c}>{t(categoryLabel(c))}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={t("Note")} className="mt-3">
            <input className={inputCls} value={draft.note ?? ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </Field>
          <div className="mt-3 flex justify-end">
            <Button onClick={add} disabled={draft.amount <= 0}>
              <Plus size={16} /> {t("Add rule")}
            </Button>
          </div>
        </div>

        {data.finances.recurring.length > 0 && (
          <div className="divide-y divide-[var(--border)]">
            {data.finances.recurring.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t(categoryLabel(r.category))}</div>
                  <div className="text-xs text-[var(--text-faint)]">
                    {r.type === "income" ? "+" : "−"}{r.amount} · {t("Day")} {r.dayOfMonth}
                    {r.note ? ` · ${r.note}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveRecurring({ ...r, active: !r.active })}
                    className={`rounded-lg px-2 py-1 text-xs font-medium ${r.active ? "text-[var(--good)]" : "text-[var(--text-faint)]"}`}
                  >
                    {r.active ? t("Active") : t("Paused")}
                  </button>
                  <button onClick={() => removeRecurring(r.id)} className="text-[var(--text-faint)] hover:text-[var(--bad)]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>{t("Done")}</Button>
        </div>
      </div>
    </Modal>
  );
}
