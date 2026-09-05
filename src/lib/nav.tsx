import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarCheck,
  CalendarDays,
  Compass,
  Dumbbell,
  FileText,
  FlaskConical,
  Gauge,
  Gift,
  HeartPulse,
  Image as ImageIcon,
  Timer,
  KanbanSquare,
  ListChecks,
  type LucideIcon,
  Medal,
  Moon,
  Sparkles,
  Sunrise,
  Scale,
  ShieldCheck,
  Target,
  Settings as SettingsIcon,
  Trophy,
  UserCircle,
  Wallet,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/morning", label: "Morning", icon: Sunrise },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/sleep", label: "Sleep", icon: Moon },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/vision", label: "Vision Board", icon: ImageIcon },
  { href: "/projects", label: "Projects", icon: KanbanSquare },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/correlations", label: "Correlations", icon: ArrowLeftRight },
  { href: "/analysis", label: "Analysis", icon: Brain },
  { href: "/ai", label: "AI analysis", icon: Sparkles },
  { href: "/wheel", label: "Wheel of Life", icon: Compass },
  { href: "/coach", label: "Coach", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/about", label: "About you", icon: UserCircle },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/rewards", label: "Reward shop", icon: Gift },
  { href: "/scoreboard", label: "Scoreboard", icon: Medal },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
  // Legal pages are nav items so the imprint is reachable in two taps (More → Imprint),
  // which is what § 5 DDG's "easily recognisable and directly reachable" is read to mean.
  { href: "/legal/privacy", label: "Privacy", icon: ShieldCheck },
  { href: "/legal/imprint", label: "Imprint", icon: Scale },
];

/** Default pages on the mobile bottom bar; the rest live under "More". User-customisable. */
export const DEFAULT_PINNED = ["/", "/today", "/habits", "/statistics"];

/** Resolve the pinned bottom-bar items (max 4) from saved hrefs, falling back to defaults. */
export function pinnedNav(pinned?: string[]): NavItem[] {
  const hrefs = pinned && pinned.length ? pinned : DEFAULT_PINNED;
  return hrefs
    .map((h) => NAV.find((n) => n.href === h))
    .filter((n): n is NavItem => !!n)
    .slice(0, 4);
}

/** Grouping for the mobile "More" sheet (keeps it scannable as features grow). */
export const SECTIONS: { label: string; hrefs: string[] }[] = [
  { label: "Daily", hrefs: ["/", "/today", "/morning", "/habits", "/focus", "/training", "/sleep", "/health", "/journal", "/calendar"] },
  { label: "Insights", hrefs: ["/statistics", "/correlations", "/analysis", "/ai", "/wheel", "/coach", "/reports", "/achievements", "/rewards", "/scoreboard"] },
  { label: "Areas", hrefs: ["/goals", "/vision", "/projects", "/experiments", "/finances"] },
  { label: "System", hrefs: ["/profile", "/about", "/settings", "/legal/privacy", "/legal/imprint"] },
];

/** Apply the user's saved sidebar order, keeping any new items at the end. */
export function orderNav(order?: string[]): NavItem[] {
  if (!order?.length) return NAV;
  const byHref = new Map(NAV.map((n) => [n.href, n] as const));
  const out: NavItem[] = [];
  for (const href of order) {
    const n = byHref.get(href);
    if (n) {
      out.push(n);
      byHref.delete(href);
    }
  }
  for (const n of NAV) if (byHref.has(n.href)) out.push(n);
  return out;
}
