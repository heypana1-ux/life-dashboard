"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Pencil, Plus, Sparkles, Target, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { resizeImageToBlob } from "@/lib/image";
import { deleteImage, putImage } from "@/lib/photoStore";
import { StoredImage } from "@/components/StoredImage";
import { VisionItem } from "@/lib/types";
import {
  Button,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  inputCls,
  HeaderPill,
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
      // Card art goes to IndexedDB — a vision board is mostly images, and inline data URLs
      // filled the localStorage budget after a handful of cards.
      const ref = await putImage(await resizeImageToBlob(file, 1200, 0.72));
      setDraft((d) => ({ ...d, image: ref }));
    } catch {
      /* ignore unreadable images */
    }
  }

  return (
    <div>
      <PageHeader
        kicker={t("Where you're headed")}
        lead={t("Vision")}
        title={t("Board")}
        subtitle={
          items.length
            ? `${t("The picture worth working toward.")} ${t("{n} of {m} visions.", { n: items.filter((v) => !v.done).length, m: items.length })}`
            : t("The picture worth working toward.")
        }
        action={
          <HeaderPill onClick={openNew}>
            <Plus size={14} strokeWidth={2.4} /> {t("Add")}
          </HeaderPill>
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
        <>
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {items.map((v) => (
              <div
                key={v.id}
                className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)]"
              >
                <div className="area-grad relative flex h-[150px] w-full items-center justify-center">
                  {v.image ? (
                    <StoredImage src={v.image} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <Sparkles size={30} className="opacity-55" />
                  )}
                  {v.done && (
                    <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[var(--good)] px-2 py-1 text-[10.5px] font-bold text-white">
                      <Check size={12} strokeWidth={2.6} /> {t("Achieved")}
                    </span>
                  )}
                  <span className="absolute right-2.5 top-2.5 flex gap-[5px]">
                    <button
                      onClick={() => openEdit(v)}
                      className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-black/[0.42] text-white backdrop-blur hover:bg-black/60"
                      aria-label={t("Edit")}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => removeVisionItem(v.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-black/[0.42] text-white backdrop-blur hover:bg-black/60"
                      aria-label={t("Delete")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
                <div className="px-4 pb-4 pt-[15px]">
                  <div className="flex items-start justify-between gap-2.5">
                    <h3
                      className={`text-[15px] font-semibold tracking-[-0.01em] ${v.done ? "text-[var(--text-muted)] line-through" : ""}`}
                    >
                      {v.title}
                    </h3>
                    {v.targetYear && (
                      <span className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--text-faint)]">
                        <Target size={12} /> {v.targetYear}
                      </span>
                    )}
                  </div>
                  {v.category && (
                    <span className="area-soft mt-2 inline-block rounded-full px-[9px] py-[3px] text-[10.5px] font-semibold">
                      {v.category}
                    </span>
                  )}
                  {v.note && (
                    <p className="mt-2.5 whitespace-pre-wrap text-[12.5px] leading-[1.5] text-[var(--text-muted)]">
                      {v.note}
                    </p>
                  )}
                  <button
                    onClick={() => saveVisionItem({ ...v, done: !v.done })}
                    className={`mt-3 flex items-center gap-1.5 text-[11.5px] font-semibold ${v.done ? "area-text" : "text-[var(--text-faint)] hover:text-[var(--area-a)]"}`}
                  >
                    <Check size={13} /> {v.done ? t("Mark as not yet") : t("Mark as achieved")}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3.5 text-[10.5px] leading-[1.5] text-[var(--text-dim)]">
            {t("Drop your own photo on a card to replace the gradient — images stay on your device.")}
          </p>
        </>
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
                <StoredImage src={draft.image} className="h-full w-full object-cover" />
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (draft.image) void deleteImage(draft.image);
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
