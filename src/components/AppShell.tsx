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
  { href: "/morning", label: "Morning", icon: Sunrise },
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/sleep", label: "Sleep", icon: Moon },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/projects", label: "Projects", icon: KanbanSquare },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
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
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--border)] px-3 py-6 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
            <Sparkles size={18} />
          </div>
          <span className="font-semibold tracking-tight">{t("Life Dashboard")}</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto hide-scrollbar">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              label={t(item.label)}
              active={isActive(pathname, item.href)}
            />
          ))}
        </nav>
        <p className="px-3 pt-2 text-[11px] text-[var(--text-faint)]">
          {t("Data stays on this device.")}
        </p>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pt-8">
        <BackupReminder />
        <Reminders />
        <div className="animate-in">{children}</div>
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
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
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
