"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  Gauge,
  ListChecks,
  type LucideIcon,
  Menu,
  Moon,
  Target,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Onboarding } from "@/components/Onboarding";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/sleep", label: "Sleep", icon: Moon },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

// Shown in the mobile bottom bar; the rest live under "More".
const BOTTOM = NAV.slice(0, 4);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, ready } = useStore();
  const pathname = usePathname();
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
          <span className="font-semibold tracking-tight">Life Dashboard</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>
        <p className="px-3 text-[11px] text-[var(--text-faint)]">
          Data stays on this device.
        </p>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pt-8">
        <div className="animate-in">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur md:hidden">
        {BOTTOM.map((item) => (
          <BottomLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className={clsx(
            "flex flex-1 flex-col items-center gap-1 py-2 text-[11px]",
            moreOpen ? "text-[var(--accent)]" : "text-[var(--text-faint)]",
          )}
        >
          <Menu size={20} />
          More
        </button>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-16 left-3 right-3 grid grid-cols-3 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV.slice(4).map((item) => {
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
                  {item.label}
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

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
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
      {item.label}
    </Link>
  );
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
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
      {item.label}
    </Link>
  );
}
