import type { useStore } from "./store";
import { AreaKey, DailyReview, HealthLog } from "./types";
import { todayISO } from "./date";
import { DASHBOARD_CARDS, CARD_LABELS, effectiveLayout, isDashboardCard, type DashboardCardId } from "./dashboardCards";

/*
  Tools the AI coach can call to actually WRITE data on the user's behalf (create habits, log a
  check-in, a workout, sleep, journal, focus, weight, water, goals). The model proposes a tool
  call; the client executes it here against the store and feeds the result back so the coach can
  confirm. Everything runs locally through the normal store mutations — nothing new server-side.
*/

type Store = ReturnType<typeof useStore>;
type Args = Record<string, unknown>;

/** Side effects a tool may need beyond the store (client-only), e.g. navigation. */
export interface ToolEffects {
  navigate?: (href: string) => void;
}

/** Pages the AI can take the user to. Keys are friendly aliases the model can use. */
const ROUTES: Record<string, string> = {
  dashboard: "/", home: "/", today: "/today", morning: "/morning",
  habits: "/habits", focus: "/focus", training: "/training", sport: "/training",
  sleep: "/sleep", health: "/health", calendar: "/calendar", journal: "/journal",
  goals: "/goals", vision: "/vision", projects: "/projects", experiments: "/experiments",
  finances: "/finances", statistics: "/statistics", correlations: "/correlations",
  analysis: "/analysis", wheel: "/wheel", coach: "/coach", profile: "/profile",
  about: "/about", reports: "/reports", achievements: "/achievements",
  rewards: "/rewards", scoreboard: "/scoreboard", settings: "/settings",
};

const AREAS: AreaKey[] = ["productivity", "sport", "sleep", "habits", "learning", "creativity", "reflection", "finances", "health"];
const toArea = (a: unknown): AreaKey => (typeof a === "string" && (AREAS as string[]).includes(a) ? (a as AreaKey) : "habits");
const toDate = (v: unknown): string => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : todayISO());
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
function clampInt(v: unknown, lo: number, hi: number, def: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def;
}

/** OpenAI-style function/tool definitions sent to the model in agent mode. */
export const COACH_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_habit",
      description: "Create a new habit to build (or a 'reduce' anti-habit) for the user.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          area: { type: "string", enum: ["productivity", "sport", "sleep", "habits", "learning", "creativity"], description: "Life area." },
          kind: { type: "string", enum: ["build", "reduce"], description: "build = do more, reduce = do less." },
          timesPerWeek: { type: "integer", description: "1-7. Omit for a daily habit." },
          targetMinutes: { type: "integer", description: "Optional minutes per occurrence." },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_habit_done",
      description: "Mark an existing habit as done (or not done) on a date. Match by name.",
      parameters: {
        type: "object",
        properties: {
          habit: { type: "string", description: "The habit name to match." },
          done: { type: "boolean", description: "Default true." },
          date: { type: "string", description: "YYYY-MM-DD. Default today." },
        },
        required: ["habit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_checkin",
      description: "Log the daily check-in ratings (1-10). Only include the ones the user mentioned.",
      parameters: {
        type: "object",
        properties: {
          mood: { type: "integer" }, energy: { type: "integer" }, productivity: { type: "integer" },
          satisfaction: { type: "integer" }, discipline: { type: "integer" },
          date: { type: "string", description: "YYYY-MM-DD. Default today." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_sleep",
      description: "Log a night's sleep by duration in hours and optional quality (1-10).",
      parameters: {
        type: "object",
        properties: {
          hours: { type: "number" },
          quality: { type: "integer", description: "1-10." },
          date: { type: "string", description: "The morning you woke up, YYYY-MM-DD. Default today." },
        },
        required: ["hours"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_workout",
      description: "Log a workout / training session.",
      parameters: {
        type: "object",
        properties: {
          sport: { type: "string" },
          minutes: { type: "integer" },
          date: { type: "string", description: "YYYY-MM-DD. Default today." },
        },
        required: ["sport"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_journal_entry",
      description: "Save a journal entry.",
      parameters: {
        type: "object",
        properties: {
          body: { type: "string" },
          title: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD. Default today." },
        },
        required: ["body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_focus_session",
      description: "Log a completed deep-work / focus session in minutes.",
      parameters: {
        type: "object",
        properties: { minutes: { type: "integer" }, label: { type: "string" } },
        required: ["minutes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_goal",
      description: "Create a goal.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          area: { type: "string" },
          deadline: { type: "string", description: "Optional YYYY-MM-DD." },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_water",
      description: "Set today's water intake in glasses.",
      parameters: {
        type: "object",
        properties: { glasses: { type: "integer" }, date: { type: "string" } },
        required: ["glasses"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_weight",
      description: "Log a body-weight measurement in kilograms.",
      parameters: {
        type: "object",
        properties: { kg: { type: "number" }, date: { type: "string" } },
        required: ["kg"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_transaction",
      description: "Record an income or expense in Finances.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["income", "expense"], description: "Default expense." },
          amount: { type: "number", description: "A positive amount." },
          category: { type: "string", description: "e.g. Groceries, Salary, Rent." },
          note: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD. Default today." },
        },
        required: ["amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description:
        "Take the user to a page in the app. Use when they ask to open, go to, show, or navigate to a section or the settings.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description:
              "Target page, e.g. today, habits, sleep, finances, statistics, settings, coach, goals, calendar, health, training, profile, rewards, achievements, scoreboard.",
          },
        },
        required: ["to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_dashboard",
      description:
        "Show, hide or reset dashboard cards. Use when the user asks to change what's on their dashboard.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["show", "hide", "reset"], description: "reset restores the default layout." },
          card: {
            type: "string",
            enum: [...DASHBOARD_CARDS],
            description: "Which card. Required for show/hide, ignored for reset.",
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_vacation",
      description:
        "Add a vacation range so streaks are protected and scoring is lenient across those days.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Start date YYYY-MM-DD." },
          to: { type: "string", description: "End date YYYY-MM-DD (inclusive). Defaults to 'from'." },
        },
        required: ["from"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_settings",
      description:
        "Change a personal setting. Only include the fields the user asked to change.",
      parameters: {
        type: "object",
        properties: {
          sleepTargetHours: { type: "number", description: "Nightly sleep goal in hours (e.g. 8)." },
          focusTargetMinutes: { type: "integer", description: "Daily deep-work target in minutes." },
          checkinCounts: { type: "boolean", description: "Whether the daily check-in counts toward the Life Score." },
          waterGoalGlasses: { type: "integer", description: "Daily water goal in glasses." },
          theme: { type: "string", enum: ["light", "dark", "system"] },
          language: { type: "string", enum: ["en", "de"] },
        },
      },
    },
  },
] as const;

/** Execute one tool call against the store; returns a short human-readable result.
 *  `effects` carries client-only capabilities (navigation) used by the header quick-capture. */
export function runCoachTool(store: Store, name: string, args: Args, effects?: ToolEffects): string {
  const { data } = store;
  switch (name) {
    case "create_habit": {
      const nm = str(args.name);
      if (!nm) return "Error: missing habit name.";
      const kind = args.kind === "reduce" ? "reduce" : "build";
      const tpw = args.timesPerWeek != null ? clampInt(args.timesPerWeek, 1, 7, 3) : undefined;
      store.addHabit({
        name: nm,
        area: toArea(args.area),
        kind,
        schedule: tpw ? { type: "weekly", timesPerWeek: tpw } : { type: "daily" },
        targetMinutes: args.targetMinutes != null ? clampInt(args.targetMinutes, 1, 600, 30) : undefined,
        priority: "medium",
        difficulty: 3,
        ...(kind === "reduce" ? { severity: 3 } : {}),
      });
      return `Created ${kind} habit "${nm}".`;
    }
    case "mark_habit_done": {
      const q = str(args.habit).toLowerCase();
      const habit = data.habits.find((h) => !h.archived && h.name.toLowerCase() === q)
        ?? data.habits.find((h) => !h.archived && h.name.toLowerCase().includes(q));
      if (!habit) return `No habit matching "${str(args.habit)}".`;
      const date = toDate(args.date);
      store.setHabitLog({ habitId: habit.id, date, done: args.done !== false, doneAt: new Date().toISOString() });
      return `Marked "${habit.name}" ${args.done === false ? "not done" : "done"} for ${date}.`;
    }
    case "log_checkin": {
      const date = toDate(args.date);
      const prev = data.reviews.find((r) => r.date === date);
      const keys: (keyof DailyReview)[] = ["mood", "energy", "productivity", "satisfaction", "discipline"];
      const review: DailyReview = {
        date,
        mood: prev?.mood ?? 5, energy: prev?.energy ?? 5, productivity: prev?.productivity ?? 5,
        satisfaction: prev?.satisfaction ?? 5, discipline: prev?.discipline ?? 5,
        wentWell: prev?.wentWell, wentBad: prev?.wentBad, improveTomorrow: prev?.improveTomorrow,
      };
      let any = false;
      for (const k of keys) {
        if (args[k] != null) { (review[k] as number) = clampInt(args[k], 1, 10, 5); any = true; }
      }
      if (!any) return "Error: no ratings given.";
      store.saveReview(review);
      return `Logged your check-in for ${date}.`;
    }
    case "log_sleep": {
      const hours = Math.max(0.5, Math.min(24, Number(args.hours) || 0));
      if (!hours) return "Error: missing sleep hours.";
      const date = toDate(args.date);
      const quality = clampInt(args.quality, 1, 10, 7);
      const wakeH = 7;
      const totalMin = wakeH * 60 - Math.round(hours * 60);
      const bedH = ((Math.floor(totalMin / 60) % 24) + 24) % 24;
      const bedM = ((totalMin % 60) + 60) % 60;
      store.saveSleep({
        date,
        bedTime: `${String(bedH).padStart(2, "0")}:${String(bedM).padStart(2, "0")}`,
        wakeTime: "07:00",
        quality,
        morningEnergy: quality,
      });
      return `Logged ${hours}h of sleep for ${date}.`;
    }
    case "log_workout": {
      const sport = str(args.sport);
      if (!sport) return "Error: missing sport.";
      const date = toDate(args.date);
      store.saveWorkout({ id: "", date, sport, durationMin: clampInt(args.minutes, 1, 600, 45), exercises: [] });
      return `Logged a ${sport} workout for ${date}.`;
    }
    case "add_journal_entry": {
      const body = str(args.body);
      if (!body) return "Error: empty entry.";
      const now = new Date().toISOString();
      store.saveJournal({ id: "", date: toDate(args.date), title: str(args.title) || "Note", body, createdAt: now, updatedAt: now });
      return "Saved a journal entry.";
    }
    case "add_focus_session": {
      const minutes = clampInt(args.minutes, 1, 600, 25);
      store.addFocusSession(minutes, str(args.label) || undefined);
      return `Logged a ${minutes} min focus session.`;
    }
    case "add_goal": {
      const title = str(args.title);
      if (!title) return "Error: missing goal title.";
      store.saveGoal({
        id: "", title, area: toArea(args.area), progress: 0, milestones: [],
        deadline: /^\d{4}-\d{2}-\d{2}$/.test(str(args.deadline)) ? str(args.deadline) : undefined,
        createdAt: new Date().toISOString(), archived: false,
      });
      return `Added the goal "${title}".`;
    }
    case "log_water": {
      const date = toDate(args.date);
      const prev = data.health.find((h) => h.date === date) ?? ({ date } as HealthLog);
      store.saveHealth({ ...prev, date, hydration: clampInt(args.glasses, 0, 40, 0) });
      return `Set water to ${clampInt(args.glasses, 0, 40, 0)} glasses for ${date}.`;
    }
    case "log_weight": {
      const kg = Number(args.kg);
      if (!Number.isFinite(kg) || kg < 20 || kg > 400) return "Error: implausible weight.";
      const date = toDate(args.date);
      store.saveWeight({ date, kg: Math.round(kg * 10) / 10 });
      return `Logged ${Math.round(kg * 10) / 10} kg for ${date}.`;
    }
    case "log_transaction": {
      const amount = Math.abs(Number(args.amount));
      if (!Number.isFinite(amount) || amount <= 0) return "Error: missing or invalid amount.";
      const type = args.type === "income" ? "income" : "expense";
      store.saveTransaction({
        id: "",
        date: toDate(args.date),
        type,
        category: str(args.category) || (type === "income" ? "Income" : "General"),
        amount: Math.round(amount * 100) / 100,
        note: str(args.note) || undefined,
      });
      return `Logged ${type} of ${Math.round(amount * 100) / 100}${str(args.category) ? ` (${str(args.category)})` : ""}.`;
    }
    case "navigate": {
      const key = str(args.to).toLowerCase().replace(/^\/+/, "");
      const href = ROUTES[key] ?? (Object.values(ROUTES).includes(`/${key}`) ? `/${key}` : undefined);
      if (!href) return `No page matching "${str(args.to)}".`;
      if (effects?.navigate) {
        effects.navigate(href);
        return `Opened ${key || "dashboard"}.`;
      }
      return `To open it, go to ${href}.`;
    }
    case "adjust_dashboard": {
      const action = str(args.action).toLowerCase();
      const layout = effectiveLayout(data.settings.dashboard);
      if (action === "reset") {
        store.updateSettings({ dashboard: undefined });
        return "Reset the dashboard to its default layout.";
      }
      const card = str(args.card);
      if (!isDashboardCard(card)) return `Unknown dashboard card "${card}".`;
      const hidden = new Set<DashboardCardId>(layout.hidden);
      if (action === "show") hidden.delete(card);
      else if (action === "hide") hidden.add(card);
      else return `Unknown action "${action}".`;
      store.updateSettings({ dashboard: { order: layout.order, hidden: [...hidden] } });
      return `${action === "show" ? "Showing" : "Hid"} the "${CARD_LABELS[card]}" card on your dashboard.`;
    }
    case "set_vacation": {
      const from = toDate(args.from);
      const to = /^\d{4}-\d{2}-\d{2}$/.test(str(args.to)) ? str(args.to) : from;
      const lo = from <= to ? from : to;
      const hi = from <= to ? to : from;
      const vacations = [...(data.settings.vacations ?? []), { from: lo, to: hi }];
      store.updateSettings({ vacations });
      return lo === hi ? `Marked ${lo} as a vacation day.` : `Marked ${lo} to ${hi} as vacation.`;
    }
    case "update_settings": {
      const patch: Record<string, unknown> = {};
      const changed: string[] = [];
      if (args.sleepTargetHours != null) {
        const h = Math.max(3, Math.min(14, Number(args.sleepTargetHours)));
        if (Number.isFinite(h)) { patch.sleepTargetMinutes = Math.round(h * 60); changed.push(`sleep target ${h}h`); }
      }
      if (args.focusTargetMinutes != null) {
        patch.focusTargetMinutes = clampInt(args.focusTargetMinutes, 5, 720, 120); changed.push(`focus target ${patch.focusTargetMinutes}min`);
      }
      if (typeof args.checkinCounts === "boolean") {
        patch.checkinCounts = args.checkinCounts; changed.push(`check-in scoring ${args.checkinCounts ? "on" : "off"}`);
      }
      if (args.waterGoalGlasses != null) {
        patch.waterGoalGlasses = clampInt(args.waterGoalGlasses, 1, 40, 8); changed.push(`water goal ${patch.waterGoalGlasses}`);
      }
      if (args.theme === "light" || args.theme === "dark" || args.theme === "system") {
        patch.theme = args.theme; changed.push(`theme ${args.theme}`);
      }
      if (args.language === "en" || args.language === "de") {
        patch.language = args.language; changed.push(`language ${args.language}`);
      }
      if (changed.length === 0) return "Error: no supported setting to change.";
      store.updateSettings(patch);
      return `Updated ${changed.join(", ")}.`;
    }
    default:
      return `Unknown tool: ${name}.`;
  }
}
