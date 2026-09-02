"use client";

import { useState } from "react";
import { MessageCircle, MessageSquarePlus, Sparkles, Trash2 } from "lucide-react";
import clsx from "clsx";
import { CoachChat } from "@/components/Coach";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function CoachPage() {
  const { data, removeCoachChat } = useStore();
  const t = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const chats = [...(data.coachChats ?? [])].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const activeTitle = selectedId ? chats.find((c) => c.id === selectedId)?.title : null;

  function newChat() {
    setSelectedId(null);
    setListOpen(false);
  }
  function pick(id: string) {
    setSelectedId(id);
    setListOpen(false);
  }

  const list = (
    <div className="flex flex-col gap-1">
      <button
        onClick={newChat}
        className="area-soft mb-1.5 flex items-center gap-2 rounded-[13px] px-3 py-[9px] text-[12.5px] font-semibold hover:brightness-105"
      >
        <MessageSquarePlus size={15} /> {t("New chat")}
      </button>
      {chats.length === 0 && <p className="px-2 py-3 text-xs text-[var(--text-faint)]">{t("Your chats will appear here.")}</p>}
      {chats.map((c) => (
        <div
          key={c.id}
          className={clsx(
            "group flex items-center gap-1 rounded-[12px] px-2.5 py-[9px] text-[12.5px]",
            selectedId === c.id ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]",
          )}
        >
          <button onClick={() => pick(c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <MessageCircle size={14} className="shrink-0 text-[var(--text-faint)]" />
            <span className="truncate">{c.title || t("Chat")}</span>
          </button>
          <button
            onClick={() => {
              removeCoachChat(c.id);
              if (selectedId === c.id) setSelectedId(null);
            }}
            className="shrink-0 rounded p-1 text-[var(--text-faint)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--bad)]"
            aria-label={t("Delete")}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-[calc(100dvh-104px)] gap-4">
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="card !p-3">{list}</div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="card relative flex min-h-0 flex-1 flex-col overflow-hidden border-[var(--accent)]/30 !p-0">
          <div className="grad flex items-center gap-2.5 px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white/20 backdrop-blur-sm">
              <Sparkles size={18} />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[14.5px] font-bold">{t("Coach")}</div>
              <div className="truncate text-[11px] text-white/85">{activeTitle || t("Your data, interpreted. Ask anything.")}</div>
            </div>
            <button onClick={() => setListOpen((o) => !o)} className="rounded-[10px] bg-white/20 px-[11px] py-1.5 text-[11.5px] font-semibold lg:hidden">
              {t("Chats")}
            </button>
          </div>

          {listOpen && <div className="max-h-[45vh] overflow-y-auto border-b border-[var(--border)] bg-[var(--surface)] p-3 lg:hidden">{list}</div>}

          <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-[var(--accent-soft)]/45 via-[var(--surface)] to-[var(--surface)] px-3.5 pb-3.5 pt-2.5">
            <CoachChat hideHeader chatId={selectedId} onThreadCreated={setSelectedId} />
          </div>
        </div>
      </div>
    </div>
  );
}
