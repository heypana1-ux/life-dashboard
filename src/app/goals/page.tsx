"use client";

import { useState } from "react";
import { Check, LayoutTemplate, Plus, Sparkles, Target, Trash2, Flag, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { AreaKey, Goal } from "@/lib/types";
import { fmtShort, todayISO } from "@/lib/date";
import { uid, HABIT_COLORS } from "@/lib/defaults";
import { GOAL_TEMPLATES } from "@/lib/templates";
import { useT } from "@/lib/i18n";
import { habit30dRate } from "@/lib/habitStats";
import { goalForecast } from "@/lib/goalForecast";
import { buildCoachContext } from "@/lib/coachContext";
import { planGoal, parseGoalPlan, checkCoachConfigured, GoalPlan } from "@/lib/ai";
import { Card, PageHeader, Button, Modal, Field, inputCls, EmptyState, Badge, HeaderAction } from "@/components/ui";
import { Meter } from "@/components/ScoreRing";
import clsx from "clsx";

const GOAL_AREAS = [
  "sport",
  "learning",
  "creativity",
  "finances",
  "career",
  "travel",
  "personal",
] as const;

export default function GoalsPage() {
  const { data, saveGoal, removeGoal } = useStore();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Goal | null>(null);
  const [tpl, setTpl] = useState(false);

  const active = data.goals.filter((g) => !g.archived);

  function addTemplate(tmpl: (typeof GOAL_TEMPLATES)[number]) {
    saveGoal({
      id: "",
      title: tmpl.title,
      description: "",
      area: tmpl.area,
      deadline: "",
      progress: 0,
      milestones: tmpl.milestones.map((label) => ({ id: uid("ms"), label, done: false })),
      createdAt: todayISO(),
      archived: false,
    });
  }

  function newGoal() {
    setDraft({
      id: "",
      title: "",
      description: "",
      area: "personal",
      deadline: "",
      progress: 0,
      milestones: [],
      createdAt: todayISO(),
      archived: false,
    });
    setOpen(true);
  }

  function edit(g: Goal) {
    setDraft({ ...g, milestones: g.milestones.map((m) => ({ ...m })) });
    setOpen(true);
  }

  function submit() {
    if (!draft || !draft.title.trim()) return;
    saveGoal(draft);
    setOpen(false);
  }

  function toggleMilestone(g: Goal, mid: string) {
    const milestones = g.milestones.map((m) => (m.id === mid ? { ...m, done: !m.done } : m));
    const doneCount = milestones.filter((m) => m.done).length;
    const progress = milestones.length
      ? Math.round((doneCount / milestones.length) * 100)
      : g.progress;
    saveGoal({ ...g, milestones, progress });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`${active.length} ${t("active goals")}`}
        lead={t("Your")}
        title={t("Goals")}
        subtitle={t("Longer-term outcomes, distinct from daily habits.")}
        action={
          <>
            <HeaderAction label={t("Templates")} onClick={() => setTpl(true)}>
              <LayoutTemplate size={17} />
            </HeaderAction>
            <HeaderAction primary label={t("New goal")} onClick={newGoal}>
              <Plus size={17} />
            </HeaderAction>
          </>
        }
      />

      {tpl && (
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{t("Goal templates")}</span>
            <button onClick={() => setTpl(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]">{t("Close")}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {GOAL_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.title}
                onClick={() => { addTemplate(tmpl); setTpl(false); }}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-medium hover:border-[var(--accent)]"
              >
                + {t(tmpl.title)}
              </button>
            ))}
          </div>
        </Card>
      )}

      {active.length === 0 ? (
        <EmptyState
          icon={<Target size={28} />}
          title={t("No goals yet")}
          hint={t('A habit is "train 3× / week". A goal is "bench 80kg by December". Add milestones to track progress.')}
          action={
            <Button onClick={newGoal}>
              <Plus size={16} /> {t("New goal")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((g) => (
            <Card key={g.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{g.title}</span>
                    <Badge tone="accent">{t(g.area.charAt(0).toUpperCase() + g.area.slice(1))}</Badge>
                  </div>
                  {g.description && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{g.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => edit(g)}
                    className="rounded-lg px-2 py-1 text-xs text-[var(--text-faint)] hover:bg-[var(--surface-2)]"
                  >
                    {t("Edit")}
                  </button>
                  <button
                    onClick={() => removeGoal(g.id)}
                    className="rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
                    aria-label="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">{t("Progress")}</span>
                  <span className="font-semibold">{g.progress}%</span>
                </div>
                <Meter value={g.progress} color="var(--accent)" />
              </div>

              {(() => {
                const f = goalForecast(g);
                if (f.status === "done" || f.status === "unknown") return null;
                if (f.status === "stalled")
                  return (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
                      <TrendingUp size={12} /> {t("No recent progress — a small step this week restarts your pace.")}
                    </p>
                  );
                return (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-faint)]">
                    <TrendingUp size={12} className="text-[var(--accent)]" />
                    {t("At your pace, done around {date}", { date: fmtShort(f.etaDate!) })}
                    {f.status === "behind" ? (
                      <Badge tone="bad">{t("behind deadline")}</Badge>
                    ) : f.daysToDeadline != null ? (
                      <Badge tone="good">{t("on track")}</Badge>
                    ) : null}
                  </p>
                );
              })()}

              {g.deadline && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
                  <Flag size={12} /> {t("Deadline")} {fmtShort(g.deadline)}
                  {(() => {
                    const days = daysUntil(g.deadline);
                    if (g.progress >= 100) return null;
                    if (days < 0) return <Badge tone="bad">{t("overdue")}</Badge>;
                    if (days === 0) return <Badge tone="bad">{t("due today")}</Badge>;
                    if (days <= 14) return <Badge tone={days <= 3 ? "bad" : "accent"}>{t("{n} days left", { n: days })}</Badge>;
                    return null;
                  })()}
                </p>
              )}

              {g.milestones.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {g.milestones.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleMilestone(g, m.id)}
                      className="flex w-full items-center gap-2 text-left text-sm"
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                          m.done
                            ? "border-[var(--good)] bg-[var(--good)] text-white"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {m.done && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className={m.done ? "text-[var(--text-faint)] line-through" : ""}>
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {(g.linkedHabitIds?.length ?? 0) > 0 && (
                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
                    {t("Linked habits")}
                  </div>
                  <div className="space-y-1.5">
                    {(g.linkedHabitIds ?? [])
                      .map((id) => data.habits.find((h) => h.id === id))
                      .filter((h): h is NonNullable<typeof h> => !!h)
                      .map((h) => {
                        const rate = habit30dRate(data, h);
                        return (
                          <div key={h.id} className="flex items-center gap-2 text-sm">
                            <span className="min-w-0 flex-1 truncate">{h.name}</span>
                            <span
                              className={clsx(
                                "text-xs font-medium tabular-nums",
                                rate >= 70 ? "text-[var(--good)]" : rate >= 45 ? "text-[var(--warn)]" : "text-[var(--bad)]",
                              )}
                            >
                              {rate}%
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <GoalModal
        open={open}
        onClose={() => setOpen(false)}
        draft={draft}
        setDraft={setDraft}
        onSubmit={submit}
      />
    </div>
  );
}

function GoalModal({
  open,
  onClose,
  draft,
  setDraft,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  draft: Goal | null;
  setDraft: (g: Goal) => void;
  onSubmit: () => void;
}) {
  const t = useT();
  const { data, addHabit, updateSettings } = useStore();
  const d = useDerived();
  const [milestoneText, setMilestoneText] = useState("");
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const [usedHabits, setUsedHabits] = useState<Set<string>>(new Set());
  if (!draft) return null;

  const aiOn = !!data.settings.aiCoachEnabled;

  async function makePlan() {
    if (!draft?.title.trim()) return;
    setPlanErr(null);
    setPlanLoading(true);
    const ok = await checkCoachConfigured();
    if (!ok) {
      setPlanLoading(false);
      setPlanErr("not_configured");
      return;
    }
    const ctx = buildCoachContext(data, d.history).text;
    const goalText = `Goal: ${draft.title}. ${draft.description ? "Details: " + draft.description + ". " : ""}Category: ${draft.area}.${draft.deadline ? " Deadline: " + draft.deadline + "." : ""} Break this into milestones and supporting habits.`;
    const res = await planGoal(goalText, ctx, data.settings.language);
    setPlanLoading(false);
    if (res.reply) {
      const parsed = parseGoalPlan(res.reply);
      if (parsed) setPlan(parsed);
      else setPlanErr("empty");
    } else {
      setPlanErr(res.error ?? "network");
    }
  }

  function addPlanMilestone(label: string) {
    if (!draft) return;
    setDraft({ ...draft, milestones: [...draft.milestones, { id: uid("ms"), label, done: false }] });
    setUsedHabits((s) => new Set(s).add("ms:" + label));
  }
  function addAllMilestones() {
    if (!draft || !plan) return;
    const fresh = plan.milestones.filter((m) => !usedHabits.has("ms:" + m));
    setDraft({ ...draft, milestones: [...draft.milestones, ...fresh.map((label) => ({ id: uid("ms"), label, done: false }))] });
    setUsedHabits((s) => { const n = new Set(s); for (const m of plan.milestones) n.add("ms:" + m); return n; });
  }
  function addPlanHabit(h: GoalPlan["habits"][number]) {
    if (!draft) return;
    const created = addHabit({
      name: h.name,
      area: h.area as AreaKey,
      kind: "build",
      schedule: { type: "weekly", timesPerWeek: h.timesPerWeek },
      priority: "medium",
      difficulty: 3,
      color: HABIT_COLORS[(data.habits.length + h.name.length) % HABIT_COLORS.length],
    });
    setDraft({ ...draft, linkedHabitIds: [...(draft.linkedHabitIds ?? []), created.id] });
    setUsedHabits((s) => new Set(s).add("hb:" + h.name));
  }

  const buildHabits = data.habits.filter((h) => h.kind === "build" && !h.archived);
  const linked = new Set(draft.linkedHabitIds ?? []);
  function toggleLink(id: string) {
    if (!draft) return;
    const next = new Set(draft.linkedHabitIds ?? []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDraft({ ...draft, linkedHabitIds: [...next] });
  }

  function addMilestone() {
    if (!milestoneText.trim() || !draft) return;
    setDraft({
      ...draft,
      milestones: [...draft.milestones, { id: uid("ms"), label: milestoneText.trim(), done: false }],
    });
    setMilestoneText("");
  }

  return (
    <Modal open={open} onClose={onClose} title={draft.id ? t("Edit goal") : t("New goal")} wide>
      <div className="space-y-4">
        <Field label={t("Title")}>
          <input
            className={inputCls}
            placeholder="e.g. Bench press 80kg"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            autoFocus
          />
        </Field>
        <Field label={t("Description")}>
          <textarea
            className={inputCls}
            rows={2}
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Area")}>
            <select
              className={inputCls}
              value={draft.area}
              onChange={(e) => setDraft({ ...draft, area: e.target.value as Goal["area"] })}
            >
              {GOAL_AREAS.map((a) => (
                <option key={a} value={a}>
                  {t(a.charAt(0).toUpperCase() + a.slice(1))}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Deadline")}>
            <input
              type="date"
              className={inputCls}
              value={draft.deadline ?? ""}
              onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
            />
          </Field>
        </div>

        <Field label={`${t("Progress")}: ${draft.progress}%`}>
          <input
            type="range"
            min={0}
            max={100}
            value={draft.progress}
            onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </Field>

        {buildHabits.length > 0 && (
          <Field label={t("Linked habits")} hint={t("Habits that contribute to this goal.")}>
            <div className="flex flex-wrap gap-1.5">
              {buildHabits.map((h) => (
                <button
                  key={h.id}
                  onClick={() => toggleLink(h.id)}
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    linked.has(h.id)
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]",
                  )}
                >
                  {h.name}
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label={t("Milestones")}>
          <div className="space-y-1.5">
            {draft.milestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
                <span>{m.label}</span>
                <button
                  onClick={() =>
                    setDraft({ ...draft, milestones: draft.milestones.filter((x) => x.id !== m.id) })
                  }
                  className="text-[var(--text-faint)] hover:text-[var(--bad)]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder={t("Add a milestone…")}
                value={milestoneText}
                onChange={(e) => setMilestoneText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMilestone()}
              />
              <Button variant="soft" onClick={addMilestone}>
                {t("Add")}
              </Button>
            </div>
          </div>
        </Field>

        {/* AI goal breakdown */}
        <div className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)]/40 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="grad flex h-6 w-6 items-center justify-center rounded-lg text-white">
              <Sparkles size={13} />
            </span>
            <span className="text-sm font-semibold">{t("Break it down with AI")}</span>
          </div>
          {!aiOn ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--text-muted)]">{t("Let the coach suggest milestones and habits for this goal.")}</p>
              <Button size="sm" variant="soft" onClick={() => updateSettings({ aiCoachEnabled: true })}>{t("Enable")}</Button>
            </div>
          ) : (
            <>
              {!plan && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[var(--text-muted)]">{t("Turn this goal into a concrete, personal plan.")}</p>
                  <Button size="sm" onClick={makePlan} disabled={planLoading || !draft.title.trim()}>
                    <Sparkles size={14} /> {planLoading ? t("Thinking…") : t("Suggest a plan")}
                  </Button>
                </div>
              )}
              {planErr && (
                <p className="mt-1 text-xs text-[var(--bad)]">
                  {planErr === "not_configured"
                    ? t("The AI coach isn't set up yet.")
                    : t("Couldn't build a plan right now — try again.")}
                </p>
              )}
              {plan && (
                <div className="space-y-3">
                  {plan.note && <p className="text-sm text-[var(--text)]">{plan.note}</p>}
                  {plan.milestones.length > 0 && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">{t("Suggested milestones")}</span>
                        <button onClick={addAllMilestones} className="text-xs font-medium text-[var(--accent)]">{t("Add all")}</button>
                      </div>
                      <div className="space-y-1.5">
                        {plan.milestones.map((m) => {
                          const used = usedHabits.has("ms:" + m);
                          return (
                            <button
                              key={m}
                              onClick={() => !used && addPlanMilestone(m)}
                              disabled={used}
                              className="flex w-full items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-left text-sm disabled:opacity-50"
                            >
                              <Plus size={13} className="shrink-0 text-[var(--accent)]" />
                              <span className="flex-1">{m}</span>
                              {used && <Check size={13} className="text-[var(--good)]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {plan.habits.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">{t("Suggested habits")}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.habits.map((h) => {
                          const used = usedHabits.has("hb:" + h.name);
                          return (
                            <button
                              key={h.name}
                              onClick={() => !used && addPlanHabit(h)}
                              disabled={used}
                              className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium enabled:hover:border-[var(--accent)] disabled:opacity-50"
                            >
                              {used ? <Check size={12} className="text-[var(--good)]" /> : <Plus size={12} className="text-[var(--accent)]" />}
                              {h.name}
                              <span className="text-[10px] text-[var(--text-faint)]">{h.timesPerWeek}×/{t("week")}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <button onClick={() => { setPlan(null); setUsedHabits(new Set()); }} className="text-xs text-[var(--text-faint)] hover:text-[var(--text)]">
                    {t("Start over")}
                  </button>
                </div>
              )}
              <p className="mt-2 text-[10px] text-[var(--text-faint)]">{t("AI suggestions — review before adding.")}</p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={!draft.title.trim()}>
            {draft.id ? t("Save") : t("Create goal")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Whole days from today until an ISO date (negative = past). */
function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${iso}T00:00:00`);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}
