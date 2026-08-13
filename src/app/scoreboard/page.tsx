"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Crown, Medal, RefreshCw, Trophy, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { AreaKey } from "@/lib/types";
import { AREA_LABELS } from "@/lib/defaults";
import { scoreColor } from "@/lib/score";
import { Card, PageHeader, SectionTitle, Button, Field, inputCls, Toggle, Badge, EmptyState } from "@/components/ui";
import {
  isLeaderboardConfigured,
  averageScores,
  getMyRow,
  publishScores,
  getGlobalBoard,
  getMyLeagues,
  createLeague,
  joinLeague,
  getLeagueBoard,
  leaveLeague,
  type LeaderRow,
  type League,
} from "@/lib/leaderboard";

const METRICS: ("overall" | AreaKey)[] = [
  "overall",
  "productivity",
  "sport",
  "sleep",
  "habits",
  "learning",
  "creativity",
  "reflection",
  "finances",
];

type View = { type: "global" } | { type: "league"; id: string; name: string };

export default function ScoreboardPage() {
  const { sync } = useStore();
  const d = useDerived();
  const t = useT();

  const mine = useMemo(() => averageScores(d.history), [d.history]);
  const signedIn = isLeaderboardConfigured && !!sync.email;

  const [myRow, setMyRow] = useState<LeaderRow | null>(null);
  const [name, setName] = useState("");
  const [global, setGlobal] = useState(false);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [view, setView] = useState<View>({ type: "global" });
  const [metric, setMetric] = useState<"overall" | AreaKey>("overall");
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [newName, setNewName] = useState("");
  const [refresh, setRefresh] = useState(0);

  // Load my profile + leagues once signed in.
  useEffect(() => {
    if (!signedIn) return;
    let ok = true;
    (async () => {
      try {
        const [row, lgs] = await Promise.all([getMyRow(), getMyLeagues()]);
        if (!ok) return;
        if (row) {
          setMyRow(row);
          setName(row.display_name);
          setGlobal(row.global);
        }
        setLeagues(lgs);
      } catch (e) {
        if (ok) setErr(msgOf(e));
      }
    })();
    return () => {
      ok = false;
    };
  }, [signedIn, refresh]);

  // Load the selected board.
  useEffect(() => {
    if (!signedIn) return;
    let ok = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    (async () => {
      try {
        const data = view.type === "global" ? await getGlobalBoard() : await getLeagueBoard(view.id);
        if (ok) setRows(data);
      } catch (e) {
        if (ok) setErr(msgOf(e));
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [signedIn, view, refresh]);

  const ranked = useMemo(() => {
    const val = (r: LeaderRow) => (metric === "overall" ? r.overall : r.categories[metric] ?? 0);
    return [...rows].sort((a, b) => val(b) - val(a));
  }, [rows, metric]);

  const myId = myRow?.user_id;
  const myRank = myId ? ranked.findIndex((r) => r.user_id === myId) + 1 : 0;

  async function publish() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await publishScores(name, mine.overall, mine.categories, global);
      setMsg(t("Your scores are live."));
      setRefresh((n) => n + 1);
    } catch (e) {
      setErr(msgOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function doCreate() {
    if (!newName.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const lg = await createLeague(newName);
      setNewName("");
      setLeagues((l) => [...l, lg]);
      setView({ type: "league", id: lg.id, name: lg.name });
      setMsg(t("League created. Share the code: {code}", { code: lg.code }));
      setRefresh((n) => n + 1);
    } catch (e) {
      setErr(msgOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function doJoin() {
    if (!joinCode.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const lg = await joinLeague(joinCode);
      setJoinCode("");
      setLeagues((l) => (l.some((x) => x.id === lg.id) ? l : [...l, lg]));
      setView({ type: "league", id: lg.id, name: lg.name });
      setMsg(t("Joined {name}.", { name: lg.name }));
      setRefresh((n) => n + 1);
    } catch {
      setErr(t("No league found for that code."));
    } finally {
      setBusy(false);
    }
  }

  async function doLeave(id: string) {
    setBusy(true);
    try {
      await leaveLeague(id);
      setLeagues((l) => l.filter((x) => x.id !== id));
      if (view.type === "league" && view.id === id) setView({ type: "global" });
      setRefresh((n) => n + 1);
    } catch (e) {
      setErr(msgOf(e));
    } finally {
      setBusy(false);
    }
  }

  if (!isLeaderboardConfigured) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("Scoreboard")} subtitle={t("Compare your Life Score with others.")} />
        <EmptyState
          icon={<Trophy size={26} />}
          title={t("Cloud sync required")}
          hint={t("The scoreboard needs the Supabase setup so scores can be shared. Set it up in Settings first.")}
          action={
            <Link href="/settings">
              <Button variant="soft" size="sm">{t("Open Settings")}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("Scoreboard")} subtitle={t("Compare your Life Score with others.")} />
        <EmptyState
          icon={<Trophy size={26} />}
          title={t("Sign in to compete")}
          hint={t("Sign in with your account in Settings, then publish your scores here.")}
          action={
            <Link href="/settings">
              <Button variant="soft" size="sm">{t("Open Settings")}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Scoreboard")}
        subtitle={t("Compare your Life Score with others.")}
        action={
          <Button variant="soft" size="sm" onClick={() => setRefresh((n) => n + 1)}>
            <RefreshCw size={15} /> {t("Refresh")}
          </Button>
        }
      />

      {/* My profile */}
      <Card>
        <SectionTitle right={<Users size={16} className="text-[var(--text-faint)]" />}>{t("Your entry")}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label={t("Display name")}>
            <input className={inputCls} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={t("How others see you")} />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3 sm:justify-start">
            <span className="text-sm font-medium">{t("Global ranking")}</span>
            <Toggle checked={global} onChange={setGlobal} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={publish} disabled={busy || !name.trim()}>
            {myRow ? t("Update my scores") : t("Publish my scores")}
          </Button>
          <span className="text-xs text-[var(--text-faint)]">
            {t("Publishing your current 7-day average")}: {t("Overall")} <b>{mine.overall}</b>
          </span>
        </div>
        {msg && <p className="mt-2 text-sm text-[var(--good)]">{msg}</p>}
        {err && <p className="mt-2 text-sm text-[var(--bad)]">{err}</p>}
      </Card>

      {/* Leagues management */}
      <Card>
        <SectionTitle>{t("Leagues")}</SectionTitle>
        {leagues.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {leagues.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-full bg-[var(--surface-2)] py-1 pl-3 pr-1.5 text-sm">
                <button
                  onClick={() => setView({ type: "league", id: l.id, name: l.name })}
                  className={view.type === "league" && view.id === l.id ? "font-semibold text-[var(--accent)]" : ""}
                >
                  {l.name} <span className="text-xs text-[var(--text-faint)]">· {l.code}</span>
                </button>
                <button onClick={() => doLeave(l.id)} className="rounded-full px-1.5 text-xs text-[var(--text-faint)] hover:text-[var(--bad)]">
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-sm text-[var(--text-muted)]">{t("Create a league and share its code, or join one with a friend's code.")}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2">
            <input className={inputCls} placeholder={t("New league name")} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Button variant="soft" size="sm" onClick={doCreate} disabled={busy || !newName.trim()}>{t("Create")}</Button>
          </div>
          <div className="flex gap-2">
            <input className={inputCls} placeholder={t("Join code")} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
            <Button variant="soft" size="sm" onClick={doJoin} disabled={busy || !joinCode.trim()}>{t("Join")}</Button>
          </div>
        </div>
      </Card>

      {/* Board */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <BoardTab active={view.type === "global"} onClick={() => setView({ type: "global" })}>
              <Crown size={14} /> {t("Global")}
            </BoardTab>
            {view.type === "league" && (
              <BoardTab active onClick={() => {}}>
                <Users size={14} /> {view.name}
              </BoardTab>
            )}
          </div>
          <select className={`${inputCls} w-auto`} value={metric} onChange={(e) => setMetric(e.target.value as "overall" | AreaKey)}>
            {METRICS.map((m) => (
              <option key={m} value={m}>{m === "overall" ? t("Overall") : t(AREA_LABELS[m])}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">{t("Loading…")}</p>
        ) : ranked.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">
            {view.type === "global"
              ? t("No one on the global board yet. Turn on “Global ranking” above and publish.")
              : t("No scores in this league yet. Share the code so friends can join and publish.")}
          </p>
        ) : (
          <div className="space-y-1">
            {ranked.map((r, i) => {
              const value = metric === "overall" ? r.overall : r.categories[metric] ?? 0;
              const isMe = r.user_id === myId;
              return (
                <div
                  key={r.user_id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${isMe ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-2)]"}`}
                >
                  <span className="num w-7 text-center text-sm font-bold text-[var(--text-faint)]">
                    {i === 0 ? <Medal size={16} className="mx-auto text-[#eab308]" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {r.display_name}
                    {isMe && <Badge tone="accent">{t("You")}</Badge>}
                  </span>
                  <span className="num text-lg font-bold" style={{ color: scoreColor(value) }}>
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {myRank > 0 && (
          <p className="mt-3 text-center text-xs text-[var(--text-faint)]">
            {t("Your rank")}: <b>#{myRank}</b> {t("of")} {ranked.length}
          </p>
        )}
      </Card>
    </div>
  );
}

function BoardTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active ? "grad text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
      }`}
    >
      {children}
    </button>
  );
}

function msgOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
