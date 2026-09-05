"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { GripVertical, Menu, Plus, Search, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { NAV, DEFAULT_PINNED, pinnedNav, SECTIONS, orderNav, type NavItem } from "@/lib/nav";
import { Onboarding } from "@/components/Onboarding";
import { BackupReminder } from "@/components/BackupReminder";
import { Reminders } from "@/components/Reminders";
import { DayFlow } from "@/components/DayFlow";
import { RecapGate } from "@/components/Recap";
import { WeeklyReviewGate } from "@/components/WeeklyReview";
import { CoachLauncher } from "@/components/Coach";
import { CommandPalette, CommandPaletteButton, openCommandPalette } from "@/components/CommandPalette";
import { QuickCaptureButton } from "@/components/QuickCapture";
import { Tour } from "@/components/Tour";
import { PWARegister, AppPromoBanner } from "@/components/PWA";
import { LiveActivityHost, useLiveBarVisible } from "@/components/LiveActivity";
import { MediaMigration } from "@/components/MediaMigration";
import { StorageFullBanner } from "@/components/StorageFullBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, ready, updateSettings } = useStore();
  // A running workout / focus block shows a floating bar at the top; give it its own room
  // rather than letting it sit on top of the page header.
  const liveBar = useLiveBarVisible();
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const pendingDir = useRef<"left" | "right" | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  // Apply a directional slide only when navigation came from a swipe; clicks fade.
  useEffect(() => {
    setSlideDir(pendingDir.current);
    pendingDir.current = null;
  }, [pathname]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [dragHref, setDragHref] = useState<string | null>(null);
  const [overHref, setOverHref] = useState<string | null>(null);
  const [navQuery, setNavQuery] = useState("");
  const [moreQuery, setMoreQuery] = useState("");
  // Remember the "More" sheet scroll position for a short while, so reopening it right after
  // visiting a page doesn't force you to scroll back down again.
  const moreScrollRef = useRef<HTMLDivElement>(null);
  const moreScrollPos = useRef(0);
  const moreScrollAt = useRef(0);

  // Restore the remembered scroll position when the sheet reopens within 10s; otherwise start at top.
  useEffect(() => {
    if (!moreOpen) return;
    const el = moreScrollRef.current;
    if (!el) return;
    if (Date.now() - moreScrollAt.current < 10000) el.scrollTop = moreScrollPos.current;
    else moreScrollPos.current = 0;
  }, [moreOpen]);

  const orderedNav = useMemo(() => orderNav(data.settings.navOrder), [data.settings.navOrder]);
  const matches = (item: NavItem, q: string) => t(item.label).toLowerCase().includes(q.trim().toLowerCase());
  const sidebarNav = navQuery ? orderedNav.filter((n) => matches(n, navQuery)) : orderedNav;

  function reorder(targetHref: string) {
    if (!dragHref || dragHref === targetHref) return;
    const hrefs = orderedNav.map((n) => n.href);
    const from = hrefs.indexOf(dragHref);
    const to = hrefs.indexOf(targetHref);
    if (from < 0 || to < 0) return;
    hrefs.splice(from, 1);
    hrefs.splice(to, 0, dragHref);
    updateSettings({ navOrder: hrefs });
  }

  const pinned = data.settings.navPinned ?? DEFAULT_PINNED;
  const bottomItems = pinnedNav(data.settings.navPinned);
  function togglePin(href: string) {
    const next = pinned.includes(href) ? pinned.filter((h) => h !== href) : [...pinned, href];
    updateSettings({ navPinned: next });
  }

  // Swipe left/right to move to the next/previous page in the nav order (mobile).
  function navBySwipe(delta: number) {
    const idx = orderedNav.findIndex((n) => isActive(pathname, n.href));
    if (idx < 0) return;
    const next = idx + delta;
    if (next < 0 || next >= orderedNav.length) return;
    pendingDir.current = delta > 0 ? "left" : "right";
    router.push(orderedNav[next].href);
  }
  function onTouchStart(e: React.TouchEvent) {
    const el = e.target as HTMLElement;
    // Only block the page swipe on elements that need their own horizontal drag/interaction
    // (form controls, sliders, horizontal scrollers marked .no-swipe). Buttons and links are
    // fine: a tap won't clear the 70px threshold, so cards/entries stay swipeable.
    if (el.closest('input,textarea,select,[role="slider"],.recharts-responsive-container,.no-swipe')) {
      touch.current = null;
      return;
    }
    const p = e.touches[0];
    touch.current = { x: p.clientX, y: p.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touch.current) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - touch.current.x;
    const dy = p.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.7) navBySwipe(dx < 0 ? 1 : -1);
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-faint)]">
        <Sparkles className="mr-2 animate-pulse" size={18} /> Loading your dashboard…
      </div>
    );
  }

  if (!data.settings.onboardingComplete) {
    return <Onboarding />;
  }

  return (
    <div data-area={pageArea(pathname)} className="mx-auto flex min-h-screen w-full max-w-7xl">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-4 py-[22px] md:flex">
        <div className="mb-[22px] flex items-center gap-[11px] px-1.5">
          <div className="grad flex h-[34px] w-[34px] items-center justify-center rounded-[11px] text-white shadow-[var(--shadow)]">
            <Sparkles size={18} />
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.02em]">{t("Life Dashboard")}</span>
        </div>
        <button
          onClick={openCommandPalette}
          className="mb-2 flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[13px] text-[var(--text-muted)] hover:border-[var(--accent)]"
        >
          <Plus size={14} className="text-[var(--accent)]" />
          {t("Quick add")}
          <kbd className="ml-auto rounded border border-[var(--border)] px-1 py-0.5 text-[10px] text-[var(--text-faint)]">⌘K</kbd>
        </button>
        <label className="relative mb-2 flex items-center">
          <Search size={14} className="pointer-events-none absolute left-2.5 text-[var(--text-faint)]" />
          <input
            value={navQuery}
            onChange={(e) => setNavQuery(e.target.value)}
            placeholder={t("Jump to…")}
            className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pl-8 pr-2 text-[13px] outline-none focus:border-[var(--accent)]"
          />
        </label>
        <nav className="-mx-1 flex flex-1 flex-col gap-[2px] overflow-y-auto px-1 hide-scrollbar">
          {sidebarNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              label={t(item.label)}
              active={isActive(pathname, item.href)}
              draggable={!navQuery}
              dragging={dragHref === item.href}
              isOver={overHref === item.href && dragHref !== null && dragHref !== item.href}
              onDragStart={() => setDragHref(item.href)}
              onDragEnter={() => setOverHref(item.href)}
              onDrop={() => {
                reorder(item.href);
                setDragHref(null);
                setOverHref(null);
              }}
              onDragEnd={() => {
                setDragHref(null);
                setOverHref(null);
              }}
            />
          ))}
          {sidebarNav.length === 0 && (
            <p className="px-2 py-3 text-xs text-[var(--text-faint)]">{t("Nothing found.")}</p>
          )}
        </nav>
        <div className="flex items-center gap-2 px-2 pt-3 text-[11px] text-[var(--text-faint)]">
          <ShieldCheck size={13} />
          <span>{t("Your data, your account.")}</span>
        </div>
      </aside>

      {/* Quick capture — voice/AI entry, fixed just left of the avatar on every screen. */}
      <QuickCaptureButton hidden={moreOpen} />

      {/* Profile avatar — fixed top-right corner on every screen (the page header keeps its
          title on the left and its actions below on mobile, so this corner stays free). */}
      <Link
        href="/profile"
        aria-label={t("Profile")}
        className="fixed right-3 top-2.5 z-50 hidden h-9 w-9 overflow-hidden md:block rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] transition hover:ring-2 hover:ring-[var(--accent)]"
      >
        {data.settings.profile.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.settings.profile.avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grad flex h-full w-full items-center justify-center text-sm font-bold text-white">
            {(data.settings.profile.displayName || data.settings.profile.name || "?").trim().charAt(0).toUpperCase()}
          </span>
        )}
      </Link>

      {/* Main */}
      <main className="min-w-0 flex-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className={clsx("mx-auto w-full max-w-[1160px] px-[22px] pb-28 sm:px-8 md:pb-12", liveBar && "pt-[46px]")}>
          <PWARegister />
          <MediaMigration />
          <Reminders />
          <LiveActivityHost />
          <StorageFullBanner />
          <Tour />
          <DayFlow />
          <RecapGate />
          <WeeklyReviewGate />
          <CommandPalette />
          {!isActive(pathname, "/coach") && <CoachLauncher hidden={moreOpen} />}
          <div key={pathname} data-area={pageArea(pathname)} className={slideDir === "left" ? "slide-left" : slideDir === "right" ? "slide-right" : "animate-in"}>
            {children}
            {/* Nudges live below the page so every screen opens on its own header,
                exactly as in the design. */}
            <AppPromoBanner />
            <BackupReminder />
          </div>
        </div>
      </main>

      {/* Mobile bottom nav — floating pill */}
      <nav className="fixed bottom-4 left-3.5 right-3.5 z-40 flex items-stretch justify-around gap-1 rounded-[22px] border border-[var(--border)] bg-[var(--surface)]/90 p-1.5 shadow-[0_12px_40px_rgba(16,18,22,0.12)] backdrop-blur-lg md:hidden dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
        {bottomItems.map((item) => (
          <BottomLink
            key={item.href}
            item={item}
            label={t(item.label)}
            active={isActive(pathname, item.href)}
          />
        ))}
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className={clsx(
            "flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] transition",
            moreOpen ? "area-soft font-semibold" : "text-[var(--text-faint)]",
          )}
        >
          <Menu size={20} />
          {t("More")}
        </button>
      </nav>

      {/* Mobile "More" sheet — searchable + grouped */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => {
            setMoreOpen(false);
            setMoreQuery("");
          }}
        >
          <div
            className="sheet-up absolute bottom-16 left-3 right-3 flex max-h-[74vh] flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div onClick={() => { setMoreOpen(false); setMoreQuery(""); }}>
              <CommandPaletteButton />
            </div>
            <label className="relative flex items-center">
              <Search size={15} className="pointer-events-none absolute left-3 text-[var(--text-faint)]" />
              <input
                value={moreQuery}
                onChange={(e) => setMoreQuery(e.target.value)}
                placeholder={t("Search pages…")}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <div className="flex items-center gap-1.5 px-1 text-[11px] text-[var(--text-faint)]">
              <Star size={11} /> {t("Tap the star to pin a page to the bottom bar.")}
            </div>
            <div
              ref={moreScrollRef}
              onScroll={(e) => { moreScrollPos.current = e.currentTarget.scrollTop; moreScrollAt.current = Date.now(); }}
              className="space-y-3 overflow-y-auto"
            >
              {SECTIONS.map((sec) => {
                const items = sec.hrefs
                  .map((h) => NAV.find((n) => n.href === h))
                  .filter((n): n is NavItem => !!n && matches(n, moreQuery));
                if (items.length === 0) return null;
                return (
                  <div key={sec.label}>
                    <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">
                      {t(sec.label)}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isPinned = pinned.includes(item.href);
                        return (
                          <div key={item.href} className="relative">
                            <Link
                              href={item.href}
                              onClick={() => {
                                setMoreOpen(false);
                                setMoreQuery("");
                              }}
                              className={clsx(
                                "flex flex-col items-center gap-1.5 rounded-xl p-3 text-center text-xs",
                                isActive(pathname, item.href)
                                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                                  : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]",
                              )}
                            >
                              <Icon size={20} />
                              {t(item.label)}
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePin(item.href); }}
                              className="absolute right-1 top-1 rounded-md p-0.5"
                              aria-label={isPinned ? t("Unpin") : t("Pin to bar")}
                            >
                              <Star size={13} className={isPinned ? "fill-[var(--warn)] text-[var(--warn)]" : "text-[var(--text-faint)]"} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

/** Maps a route to its "Pulse" area accent (sets --area-* via data-area on the page wrapper). */
const AREA_BY_PREFIX: [string, string][] = [
  ["/today", "core"], ["/morning", "core"], ["/habits", "core"], ["/calendar", "core"], ["/coach", "core"], ["/ai", "core"],
  ["/focus", "focus"], ["/training", "training"], ["/sleep", "sleep"], ["/health", "health"],
  ["/journal", "journal"], ["/goals", "goals"], ["/vision", "vision"],
  ["/projects", "projects"], ["/experiments", "projects"],
  ["/finances", "finances"], ["/statistics", "statistics"],
  ["/correlations", "analysis"], ["/analysis", "analysis"], ["/wheel", "wheel"],
  ["/profile", "profile"], ["/about", "profile"], ["/avatar", "profile"], ["/settings", "profile"],
  ["/reports", "reports"], ["/achievements", "achievements"], ["/rewards", "achievements"], ["/scoreboard", "achievements"],
];
function pageArea(pathname: string): string {
  if (pathname === "/") return "core";
  for (const [prefix, area] of AREA_BY_PREFIX) if (pathname.startsWith(prefix)) return area;
  return "core";
}

function NavLink({
  item,
  label,
  active,
  draggable = true,
  dragging,
  isOver,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
}: {
  item: NavItem;
  label: string;
  active: boolean;
  draggable?: boolean;
  dragging?: boolean;
  isOver?: boolean;
  onDragStart?: () => void;
  onDragEnter?: () => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      draggable={draggable}
      onDragStart={
        draggable
          ? (e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", item.href);
              onDragStart?.();
            }
          : undefined
      }
      onDragEnter={draggable ? onDragEnter : undefined}
      onDragOver={draggable ? (e) => e.preventDefault() : undefined}
      onDrop={draggable ? (e) => { e.preventDefault(); onDrop?.(); } : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      className={clsx(
        "group flex items-center gap-[11px] rounded-[10px] px-[11px] py-[9px] text-[13.5px] transition",
        dragging && "opacity-40",
        isOver && "ring-2 ring-inset ring-[var(--accent)]",
        active
          ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
          : "font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
      )}
    >
      <Icon size={18} />
      <span className="flex-1">{label}</span>
      {draggable && (
        <GripVertical
          size={14}
          className="shrink-0 cursor-grab text-[var(--text-faint)] opacity-0 transition group-hover:opacity-100"
        />
      )}
    </Link>
  );
}

function BottomLink({ item, label, active }: { item: NavItem; label: string; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] transition",
        active ? "area-soft font-semibold" : "text-[var(--text-faint)]",
      )}
    >
      <Icon size={20} />
      {label}
    </Link>
  );
}
