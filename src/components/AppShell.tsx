"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Dumbbell,
  FileText,
  FlaskConical,
  Gauge,
  KanbanSquare,
  ListChecks,
  type LucideIcon,
  Menu,
  Moon,
  ShieldCheck,
  Sunrise,
  Target,
  Settings as SettingsIcon,
  Sparkles,
  Trophy,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Onboarding } from "@/components/Onboarding";
import { BackupReminder } from "@/components/BackupReminder";
import { Reminders } from "@/components/Reminders";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/morning", label: "Morning", icon: Sunrise },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/sleep", label: "Sleep", icon: Moon },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/projects", label: "Projects", icon: KanbanSquare },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

// Shown in the mobile bottom bar; the rest live under "More".
const BOTTOM = ["/", "/today", "/habits", "/statistics"].map(
  (href) => NAV.find((n) => n.href === href)!,
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, ready } = useStore();
  const pathname = usePathname();
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);

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
    <div className="mx-auto flex min-h-screen w-full max-w-7xl">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-4 py-[22px] md:flex">
        <div className="mb-[22px] flex items-center gap-[11px] px-1.5">
          <div className="grad flex h-[34px] w-[34px] items-center justify-center rounded-[11px] text-white shadow-[var(--shadow)]">
            <Sparkles size={18} />
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.02em]">{t("Life Dashboard")}</span>
        </div>
        <nav className="-mx-1 flex flex-1 flex-col gap-[2px] overflow-y-auto px-1 hide-scrollbar">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              label={t(item.label)}
              active={isActive(pathname, item.href)}
            />
          ))}
        </nav>
        <div className="flex items-center gap-2 px-2 pt-3 text-[11px] text-[var(--text-faint)]">
          <ShieldCheck size={13} />
          <span>{t("Data stays on this device.")}</span>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1160px] px-5 pb-28 sm:px-8 md:pb-12">
          <Reminders />
          <div className="animate-in">
            <BackupReminder />
            {children}
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur md:hidden">
        {BOTTOM.map((item) => (
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
            "flex flex-1 flex-col items-center gap-1 py-2 text-[11px]",
            moreOpen ? "text-[var(--accent)]" : "text-[var(--text-faint)]",
          )}
        >
          <Menu size={20} />
          {t("More")}
        </button>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-16 left-3 right-3 grid max-h-[70vh] grid-cols-3 gap-2 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV.filter((n) => !BOTTOM.includes(n)).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={clsx(
                    "flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs",
                    isActive(pathname, item.href)
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  <Icon size={20} />
                  {t(item.label)}
                </Link>
              );
            })}
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

function NavLink({ item, label, active }: { item: NavItem; label: string; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex items-center gap-[11px] rounded-[10px] px-[11px] py-[9px] text-[13.5px] transition",
        active
          ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
          : "font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
      )}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

function BottomLink({ item, label, active }: { item: NavItem; label: string; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex flex-1 flex-col items-center gap-1 py-2 text-[11px]",
        active ? "text-[var(--accent)]" : "text-[var(--text-faint)]",
      )}
    >
      <Icon size={20} />
      {label}
    </Link>
  );
}
