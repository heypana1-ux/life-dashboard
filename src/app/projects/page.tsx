"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, KanbanSquare, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { BoardKind } from "@/lib/types";
import { Card, PageHeader, Button, Chip, Modal, Field, inputCls, EmptyState, Badge } from "@/components/ui";

export const BOARD_COLUMNS: Record<BoardKind, string[]> = {
  learning: ["Backlog", "Learning", "Review", "Mastered"],
  creative: ["Idea", "Draft", "Recording", "Mixing", "Done"],
};

export default function ProjectsPage() {
  const { data, saveProject, moveProject, removeProject } = useStore();
  const t = useT();
  const [board, setBoard] = useState<BoardKind>("creative");
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const columns = BOARD_COLUMNS[board];
  const projects = data.projects.filter((p) => p.board === board);

  function add() {
    if (!title.trim()) return;
    saveProject({
      id: "",
      board,
      title: title.trim(),
      description: desc.trim() || undefined,
      column: 0,
      createdAt: "",
      updatedAt: "",
    });
    setTitle("");
    setDesc("");
    setModal(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("Creative board")}
        title={t("Projects")}
        subtitle={t("Track learning topics and creative projects from idea to done.")}
        action={
          <Button onClick={() => setModal(true)}>
            <Plus size={16} /> {t("New project")}
          </Button>
        }
      />

      <div className="flex gap-1.5">
        <Chip active={board === "creative"} onClick={() => setBoard("creative")}>
          {t("Creative")}
        </Chip>
        <Chip active={board === "learning"} onClick={() => setBoard("learning")}>
          {t("Learning")}
        </Chip>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<KanbanSquare size={26} />}
          title={t("No projects in this board yet")}
          action={
            <Button variant="soft" size="sm" onClick={() => setModal(true)}>
              <Plus size={16} /> {t("New project")}
            </Button>
          }
        />
      ) : (
        <div className="no-swipe flex gap-3 overflow-x-auto pb-2">
          {columns.map((col, ci) => {
            const items = projects.filter((p) => Math.min(p.column, columns.length - 1) === ci);
            return (
              <div key={col} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold">{t(col)}</span>
                  <Badge>{items.length}</Badge>
                </div>
                <div className="space-y-2 rounded-2xl bg-[var(--surface-2)] p-2">
                  {items.map((p) => (
                    <Card key={p.id} className="!p-3">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{p.title}</span>
                        <button onClick={() => removeProject(p.id)} className="text-[var(--text-faint)] hover:text-[var(--bad)]">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {p.description && <p className="mb-2 text-xs text-[var(--text-muted)]">{p.description}</p>}
                      <div className="flex items-center justify-between">
                        <button
                          disabled={ci === 0}
                          onClick={() => moveProject(p.id, ci - 1)}
                          className="rounded-lg p-1 text-[var(--text-faint)] enabled:hover:bg-[var(--surface-2)] disabled:opacity-30"
                          aria-label={t("Move left")}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">{t(col)}</span>
                        <button
                          disabled={ci === columns.length - 1}
                          onClick={() => moveProject(p.id, ci + 1)}
                          className="rounded-lg p-1 text-[var(--text-faint)] enabled:hover:bg-[var(--surface-2)] disabled:opacity-30"
                          aria-label={t("Move right")}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </Card>
                  ))}
                  {items.length === 0 && <div className="py-6 text-center text-xs text-[var(--text-faint)]">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={t("New project")}>
        <div className="space-y-4">
          <Field label={t("Title")}>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={board === "creative" ? "Song: XYZ" : "TMS · Muster"}
              autoFocus
            />
          </Field>
          <Field label={t("Description")}>
            <textarea className={inputCls} rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(false)}>{t("Cancel")}</Button>
            <Button onClick={add} disabled={!title.trim()}>{t("Create")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
