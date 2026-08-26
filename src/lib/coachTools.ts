import type { useStore } from "./store";
import { AreaKey, DailyReview, HealthLog } from "./types";
import { todayISO } from "./date";

/*
  Tools the AI coach can call to actually WRITE data on the user's behalf (create habits, log a
  check-in, a workout, sleep, journal, focus, weight, water, goals). The model proposes a tool
  call; the client executes it here against the store and feeds the result back so the coach can
  confirm. Everything runs locally through the normal store mutations — nothing new server-side.
*/

type Store = ReturnType<typeof useStore>;
type Args = Record<string, unknown>;

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
] as const;

/** Execute one tool call against the store; returns a short human-readable result. */
export function runCoachTool(store: Store, name: string, args: Args): string {
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
    default:
      return `Unknown tool: ${name}.`;
  }
}
