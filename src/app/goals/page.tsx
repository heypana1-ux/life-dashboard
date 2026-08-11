"use client";

import { useState } from "react";
import { Check, Plus, Target, Trash2, Flag } from "lucide-react";
import { useStore } from "@/lib/store";
import { Goal } from "@/lib/types";
import { fmtShort, todayISO } from "@/lib/date";
import { uid } from "@/lib/defaults";
import { useT } from "@/lib/i18n";
import { habit30dRate } from "@/lib/habitStats";
import { Card, PageHeader, Button, Modal, Field, inputCls, EmptyState, Badge } from "@/components/ui";
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

  const active = data.goals.filter((g) => !g.archived);

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
        title={t("Goals")}
        subtitle={t("Longer-term outcomes, distinct from daily habits.")}
        action={
          <Button onClick={newGoal}>
            <Plus size={16} /> {t("New goal")}
          </Button>
        }
      />

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

              {g.deadline && (
                <p className="mt-2 flex items-center gap-1 text-xs text-[var(--text-faint)]">
                  <Flag size={12} /> {t("Deadline")} {fmtShort(g.deadline)}
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
  const { data } = useStore();
  const [milestoneText, setMilestoneText] = useState("");
  if (!draft) return null;

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
