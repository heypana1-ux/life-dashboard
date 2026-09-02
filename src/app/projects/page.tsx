"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, KanbanSquare, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { BoardKind } from "@/lib/types";
import { PageHeader, HeaderPill, Button, Chip, Modal, Field, inputCls, EmptyState } from "@/components/ui";

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
    <div className="space-y-[14px]">
      <PageHeader
        kicker={`${board === "creative" ? t("Creative board") : t("Learning board")} · ${projects.length} ${t("projects")}`}
        title={t("Projects")}
        subtitle={t("Track learning topics and creative projects from idea to done.")}
        action={
          <HeaderPill onClick={() => setModal(true)}>
            <Plus size={14} strokeWidth={2.4} /> {t("New")}
          </HeaderPill>
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
        <>
          {/* Kanban: 224px columns on a horizontal scroller, exactly as in the design. */}
          <div className="no-swipe -mx-[22px] flex gap-2.5 overflow-x-auto px-[22px] pb-1">
            {columns.map((col, ci) => {
              const items = projects.filter((p) => Math.min(p.column, columns.length - 1) === ci);
              return (
                <div key={col} className="w-[224px] shrink-0">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <span className="text-[12.5px] font-semibold">{t(col)}</span>
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--text-muted)]">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex min-h-[96px] flex-col gap-2 rounded-[20px] bg-[var(--surface-2)] p-2">
                    {items.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-[15px] border border-[var(--border)] bg-[var(--surface)] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[12.5px] font-semibold">{p.title}</span>
                          <button
                            onClick={() => removeProject(p.id)}
                            className="shrink-0 text-[var(--text-dim)] hover:text-[var(--bad)]"
                            aria-label={t("Delete")}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        {p.description && (
                          <p className="mt-1.5 text-[11.5px] leading-[1.45] text-[var(--text-muted)]">
                            {p.description}
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center justify-between">
                          <button
                            disabled={ci === 0}
                            onClick={() => moveProject(p.id, ci - 1)}
                            className="text-[var(--text-dim)] enabled:hover:text-[var(--text)] disabled:opacity-30"
                            aria-label={t("Move left")}
                          >
                            <ChevronLeft size={15} />
                          </button>
                          <span className="text-[9.5px] uppercase tracking-[0.1em] text-[var(--text-faint)]">
                            {t(col)}
                          </span>
                          <button
                            disabled={ci === columns.length - 1}
                            onClick={() => moveProject(p.id, ci + 1)}
                            className="text-[var(--text-faint)] enabled:hover:text-[var(--text)] disabled:opacity-30"
                            aria-label={t("Move right")}
                          >
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10.5px] leading-[1.5] text-[var(--text-dim)]">
            {t("Swipe the board sideways; the arrows move a card between columns.")}
          </p>
        </>
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
