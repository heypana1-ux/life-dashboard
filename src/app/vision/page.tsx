"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Pencil, Plus, Sparkles, Target, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { resizeImageToDataUrl } from "@/lib/image";
import { VisionItem } from "@/lib/types";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  inputCls,
} from "@/components/ui";

const emptyDraft = (): VisionItem => ({
  id: "",
  title: "",
  note: "",
  image: undefined,
  category: "",
  targetYear: undefined,
  done: false,
  createdAt: new Date().toISOString(),
});

export default function VisionPage() {
  const { data, saveVisionItem, removeVisionItem } = useStore();
  const t = useT();
  const items = [...(data.visionItems ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VisionItem>(emptyDraft());
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setDraft(emptyDraft());
    setOpen(true);
  }
  function openEdit(v: VisionItem) {
    setDraft({ ...v });
    setOpen(true);
  }
  function save() {
    if (!draft.title.trim()) return;
    saveVisionItem({ ...draft, title: draft.title.trim() });
    setOpen(false);
  }
  async function pickImage(file?: File) {
    if (!file) return;
    try {
      const url = await resizeImageToDataUrl(file, 1200, 0.72);
      setDraft((d) => ({ ...d, image: url }));
    } catch {
      /* ignore unreadable images */
    }
  }

  return (
    <div>
      <PageHeader
        title={t("Vision Board")}
        subtitle={t("Where you're headed — the picture worth working toward")}
        action={
          <Button onClick={openNew}>
            <Plus size={16} /> {t("Add vision")}
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={22} />}
          title={t("Your vision board is empty")}
          hint={t("Add the goals, places and feelings you're aiming for — with a picture to make them real.")}
          action={
            <Button onClick={openNew}>
              <Plus size={16} /> {t("Add your first vision")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((v) => (
            <Card key={v.id} className="group relative overflow-hidden !p-0">
              <div className="relative h-44 w-full">
                {v.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grad flex h-full w-full items-center justify-center">
                    <Sparkles size={28} className="text-white/70" />
                  </div>
                )}
                {v.done && (
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-[var(--good)] px-2 py-0.5 text-[11px] font-semibold text-white shadow">
                    <Check size={12} /> {t("Achieved")}
                  </span>
                )}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(v)}
                    className="rounded-lg bg-black/45 p-1.5 text-white backdrop-blur hover:bg-black/60"
                    aria-label={t("Edit")}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => removeVisionItem(v.id)}
                    className="rounded-lg bg-black/45 p-1.5 text-white backdrop-blur hover:bg-black/60"
                    aria-label={t("Delete")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`font-semibold ${v.done ? "text-[var(--text-muted)] line-through" : ""}`}>{v.title}</h3>
                  {v.targetYear && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--text-faint)]">
                      <Target size={12} /> {v.targetYear}
                    </span>
                  )}
                </div>
                {v.category && (
                  <span className="mt-1.5 inline-block rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                    {v.category}
                  </span>
                )}
                {v.note && <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-muted)]">{v.note}</p>}
                <button
                  onClick={() => saveVisionItem({ ...v, done: !v.done })}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[var(--text-faint)] hover:text-[var(--accent)]"
                >
                  <Check size={13} /> {v.done ? t("Mark as not yet") : t("Mark as achieved")}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={draft.id ? t("Edit vision") : t("New vision")}>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-faint)] hover:border-[var(--accent)]"
          >
            {draft.image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.image} alt="" className="h-full w-full object-cover" />
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setDraft((d) => ({ ...d, image: undefined }));
                  }}
                  className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70"
                  aria-label={t("Remove image")}
                >
                  <X size={14} />
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-1.5 text-sm">
                <ImagePlus size={22} /> {t("Add a picture")}
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickImage(e.target.files?.[0])}
          />

          <Field label={t("Title")}>
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder={t("e.g. Run a marathon")}
              className={inputCls}
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Category")}>
              <input
                value={draft.category ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                placeholder={t("e.g. Health")}
                className={inputCls}
              />
            </Field>
            <Field label={t("Target year")}>
              <input
                type="number"
                inputMode="numeric"
                value={draft.targetYear ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, targetYear: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder={String(new Date().getFullYear() + 1)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label={t("Why it matters")}>
            <textarea
              value={draft.note ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              rows={3}
              placeholder={t("What this looks and feels like when you get there.")}
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={save} disabled={!draft.title.trim()}>
              {t("Save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
