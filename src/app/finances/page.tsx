"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import {
  AssetCategory,
  FinanceAccount,
  Holding,
  HoldingKind,
  Liability,
  Transaction,
} from "@/lib/types";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  budgetForMonth,
  currentMonth,
  financeTotals,
  fmtMoney,
  holdingGain,
  holdingGainPct,
  holdingValue,
  portfolioSummary,
} from "@/lib/finance";
import { todayISO } from "@/lib/date";
import {
  Card,
  PageHeader,
  SectionTitle,
  Button,
  Chip,
  Modal,
  Field,
  inputCls,
  EmptyState,
  Badge,
} from "@/components/ui";
import { TrendLine } from "@/components/charts";

type Tab = "overview" | "portfolio" | "budget";

export default function FinancesPage() {
  const { data } = useStore();
  const t = useT();
  const [tab, setTab] = useState<Tab>("overview");
  const cur = data.finances.currency;

  return (
    <div className="space-y-6">
      <PageHeader
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

  const history = data.finances.history.map((p) => ({ date: p.date, value: p.value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("Net worth")} value={fmtMoney(totals.netWorth, cur)} big />
        <Stat label={t("Assets")} value={fmtMoney(totals.assets, cur)} />
        <Stat label={t("Investments value")} value={fmtMoney(totals.invest, cur)} />
        <Stat label={t("Liabilities")} value={fmtMoney(totals.debt, cur)} tone="bad" />
      </div>

      <Card>
        <SectionTitle>{t("Net worth over time")}</SectionTitle>
        {history.length >= 2 ? (
          <TrendLine data={history} color="var(--good)" name={t("Net worth")} height={220} />
        ) : (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">
            {t("Not enough data in this range yet.")}
          </p>
        )}
      </Card>

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
  const { data, saveTransaction, removeTransaction } = useStore();
  const t = useT();
  const month = currentMonth();
  const b = useMemo(() => budgetForMonth(data.finances.transactions, month), [data.finances.transactions, month]);
  const [modal, setModal] = useState(false);

  const monthTxs = data.finances.transactions
    .filter((x) => x.date.slice(0, 7) === month)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("Monthly income")} value={fmtMoney(b.income, cur)} tone="good" />
        <Stat label={t("Monthly expenses")} value={fmtMoney(b.expenses, cur)} tone="bad" />
        <Stat label={t("Balance")} value={fmtMoney(b.net, cur)} tone={b.net >= 0 ? "good" : "bad"} />
        <Stat label={t("Savings rate")} value={`${b.savingsRate}%`} big />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle
            right={
              <Button variant="soft" size="sm" onClick={() => setModal(true)}>
                <Plus size={14} /> {t("Add transaction")}
              </Button>
            }
          >
            {t("This month")}
          </SectionTitle>
          {monthTxs.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("No transactions yet")}</p>
          ) : (
            <div className="max-h-96 divide-y divide-[var(--border)] overflow-y-auto">
              {monthTxs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-sm font-medium">{t(categoryLabel(tx.category))}</div>
                    <div className="text-xs text-[var(--text-faint)]">
                      {tx.date}
                      {tx.note ? ` · ${tx.note}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        tx.type === "income" ? "text-[var(--good)]" : "text-[var(--bad)]"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "−"}
                      {fmtMoney(tx.amount, cur)}
                    </span>
                    <button
                      onClick={() => removeTransaction(tx.id)}
                      className="text-[var(--text-faint)] hover:text-[var(--bad)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>{t("Expenses")}</SectionTitle>
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
                      <span className="tabular-nums text-[var(--text-muted)]">{fmtMoney(c.amount, cur)}</span>
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

      <TransactionModal open={modal} onClose={() => setModal(false)} onSave={(tx) => { saveTransaction(tx); setModal(false); }} />
    </div>
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
            <input type="number" className={inputCls} value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} />
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
            <input type="number" className={inputCls} value={draft.balance} onChange={(e) => setDraft({ ...draft, balance: Number(e.target.value) })} />
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
            <input type="number" className={inputCls} value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("Buy price")}>
            <input type="number" className={inputCls} value={draft.buyPrice} onChange={(e) => setDraft({ ...draft, buyPrice: Number(e.target.value) })} />
          </Field>
          <Field label={t("Current price")}>
            <input type="number" className={inputCls} value={draft.currentPrice} onChange={(e) => setDraft({ ...draft, currentPrice: Number(e.target.value) })} />
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
}: {
  open: boolean;
  onClose: () => void;
  onSave: (t: Transaction) => void;
}) {
  const t = useT();
  const blank: Transaction = { id: "", date: todayISO(), type: "expense", category: "Groceries", amount: 0 };
  const [draft, setDraft] = useState<Transaction>(blank);
  const cats = draft.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return (
    <Modal open={open} onClose={onClose} title={t("Add transaction")}>
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
            <input type="number" className={inputCls} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} autoFocus />
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
