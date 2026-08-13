"use client";

import { useCallback } from "react";
import { useStore } from "./store";
import { Language } from "./types";

/*
  Lightweight i18n. The English string IS the key, so untranslated strings gracefully fall
  back to English. `t("...", { n: 3 })` interpolates {n}. Use useT() in client components.
*/

type Vars = Record<string, string | number>;

// German dictionary. Keys are the English source strings.
const DE: Record<string, string> = {
  // --- Nav ---
  Dashboard: "Dashboard",
  Today: "Heute",
  Habits: "Gewohnheiten",
  Sleep: "Schlaf",
  Statistics: "Statistik",
  Journal: "Tagebuch",
  Goals: "Ziele",
  Settings: "Einstellungen",
  Finances: "Finanzen",
  Training: "Training",
  Projects: "Projekte",
  Achievements: "Erfolge",
  Reports: "Berichte",
  Calendar: "Kalender",
  Morning: "Morgen",
  Experiments: "Experimente",
  More: "Mehr",
  "Your life, day by day — tap a day to see everything you logged.":
    "Dein Leben, Tag für Tag — tippe einen Tag an, um alles Eingetragene zu sehen.",
  "Nothing logged this day.": "An diesem Tag nichts eingetragen.",
  "Good morning": "Guten Morgen",
  "Good afternoon": "Guten Tag",
  "Good evening": "Guten Abend",
  "No sleep logged for last night.": "Für letzte Nacht kein Schlaf eingetragen.",
  "Set your intention for the day. Small, consistent steps compound.":
    "Setz dir dein Ziel für den Tag. Kleine, konstante Schritte summieren sich.",

  // --- Experiments ---
  "Test a hypothesis against your own data — correlation, not proof.":
    "Teste eine Hypothese an deinen eigenen Daten — Korrelation, kein Beweis.",
  "New experiment": "Neues Experiment",
  "No experiments yet": "Noch keine Experimente",
  'e.g. "When I go to bed before midnight, am I more productive the next day?"':
    'z. B. „Wenn ich vor Mitternacht schlafen gehe, bin ich am nächsten Tag produktiver?"',
  Hypothesis: "Hypothese",
  "Outcome metric": "Zielmetrik",
  Condition: "Bedingung",
  "Start from a template": "Mit Vorlage starten",
  "Start date": "Startdatum",
  "Duration (days)": "Dauer (Tage)",
  "Bedtime before…": "Zubettgehen vor…",
  "Sleep at least…": "Schlaf mindestens…",
  "On days I train": "An Trainingstagen",
  "A specific habit is done": "Eine bestimmte Gewohnheit ist erledigt",
  "Bedtime before": "Zubettgehen vor",
  "Sleep at least": "Schlaf mindestens",
  Habit: "Gewohnheit",
  "Bedtime before {time}": "Zubettgehen vor {time}",
  "Sleep ≥ {dur}": "Schlaf ≥ {dur}",
  higher: "höher",
  lower: "niedriger",
  With: "Mit",
  Without: "Ohne",
  "Not enough data yet ({met} vs {not} days). Keep logging.":
    "Noch nicht genug Daten ({met} vs. {not} Tage). Trage weiter ein.",
  "On days with the condition, {metric} was on average {pct} {dir}.":
    "An Tagen mit der Bedingung war {metric} im Schnitt {pct} {dir}.",
  "Observation from your own data — a correlation, not causation.":
    "Beobachtung aus deinen eigenen Daten — eine Korrelation, keine Kausalität.",
  "Life Dashboard": "Life Dashboard",
  "Data stays on this device.": "Daten bleiben auf diesem Gerät.",
  "Loading your dashboard…": "Dein Dashboard wird geladen…",

  // --- Common ---
  Save: "Speichern",
  "Save changes": "Änderungen speichern",
  Cancel: "Abbrechen",
  Delete: "Löschen",
  Edit: "Bearbeiten",
  Add: "Hinzufügen",
  Continue: "Weiter",
  Back: "Zurück",
  Create: "Erstellen",
  Done: "Erledigt",
  Optional: "Optional",
  Saved: "Gespeichert",
  "Saved ✓": "Gespeichert ✓",
  All: "Alle",
  New: "Neu",
  Name: "Name",
  Type: "Typ",
  Area: "Bereich",
  Priority: "Priorität",
  Color: "Farbe",
  Progress: "Fortschritt",
  Category: "Kategorie",
  Amount: "Betrag",
  Note: "Notiz",
  Date: "Datum",
  Title: "Titel",
  Description: "Beschreibung",
  Low: "Niedrig",
  Medium: "Mittel",
  High: "Hoch",
  today: "heute",
  "this week": "diese Woche",
  planned: "geplant",
  Planned: "Geplant",
  week: "Woche",
  month: "Monat",

  // --- Dashboard ---
  "Life Score today": "Life Score heute",
  "No data yet": "Noch keine Daten",
  "vs yesterday": "ggü. gestern",
  "vs 7-day avg": "ggü. 7-Tage-Schnitt",
  Categories: "Kategorien",
  "All stats →": "Alle Statistiken →",
  "Life Rating": "Life Rating",
  "Life Score": "Life Score",
  Streak: "Streak",
  Best: "Best",
  "7-day avg": "7-Tage-Schnitt",
  "days with activity": "Tage mit Aktivität",
  "goals done": "Ziele erledigt",
  "Today's goals": "Heutige Ziele",
  "Open →": "Öffnen →",
  "No habits scheduled today": "Heute keine Gewohnheiten geplant",
  "Add habits to start building your daily plan.":
    "Füge Gewohnheiten hinzu, um deinen Tagesplan aufzubauen.",
  "Add habits": "Gewohnheiten hinzufügen",
  Insights: "Insights",
  "Data-driven": "Datenbasiert",
  "Observations from your own logs. These are associations, not medical or causal claims.":
    "Beobachtungen aus deinen eigenen Daten. Das sind Zusammenhänge, keine medizinischen oder kausalen Aussagen.",
  "Log today": "Heute eintragen",
  Creativity: "Kreativität",
  Reflection: "Reflexion",
  Excellent: "Exzellent",
  Strong: "Stark",
  Solid: "Solide",
  Mixed: "Gemischt",
  Rough: "Schwach",

  // --- Today ---
  "Daily check-in": "Täglicher Check-in",
  "Edit day": "Tag bearbeiten",
  "Edit this day": "Diesen Tag bearbeiten",
  "Night of": "Nacht vom",
  Goals_section: "Ziele",
  "Watch-list": "Beobachtungsliste",
  Reduce: "Reduzieren",
  "Tap only if the behavior happened today. Avoided by default.":
    "Nur antippen, wenn das Verhalten heute auftrat. Standardmäßig vermieden.",
  Productivity: "Produktivität",
  Mood: "Stimmung",
  Energy: "Energie",
  Satisfaction: "Zufriedenheit",
  Discipline: "Disziplin",
  "Went well": "Lief gut",
  "Went badly": "Lief schlecht",
  "Better tomorrow": "Morgen besser",
  "Save check-in": "Check-in speichern",
  "Projected score": "Prognostizierter Score",
  "Updates live as you log. Categories with no data yet are excluded.":
    "Aktualisiert sich live beim Eintragen. Kategorien ohne Daten werden ausgeschlossen.",
  "Logged for last night.": "Für letzte Nacht eingetragen.",
  "Not logged for last night.": "Für letzte Nacht nicht eingetragen.",
  "Log sleep": "Schlaf eintragen",
  Avoided: "Vermieden",
  Occurred: "Aufgetreten",

  // --- Habits ---
  "Build good routines, reduce the ones you don't want.":
    "Baue gute Routinen auf, reduziere die unerwünschten.",
  "New habit": "Neue Gewohnheit",
  "Edit habit": "Gewohnheit bearbeiten",
  Build: "Aufbauen",
  "No habits yet": "Noch keine Gewohnheiten",
  Schedule: "Zeitplan",
  Daily: "Täglich",
  "Times / week": "Mal / Woche",
  "Specific days": "Bestimmte Tage",
  "Target minutes (optional)": "Zielminuten (optional)",
  "Target value": "Zielwert",
  Unit: "Einheit",
  Difficulty: "Schwierigkeit",
  "Create habit": "Gewohnheit erstellen",
  completed: "erledigt",
  avoided: "vermieden",
  "last 30 days": "letzte 30 Tage",
  "days / week": "Tage / Woche",
  "Show heatmap": "Heatmap zeigen",
  "Hide heatmap": "Heatmap ausblenden",
  "Current streak": "Aktueller Streak",
  adherence: "Adhärenz",
  "day streak": "Tage-Streak",
  "Create your first habit to start tracking. Habits can be daily, a number of times per week, or on specific weekdays.":
    "Erstelle deine erste Gewohnheit. Gewohnheiten können täglich, mehrmals pro Woche oder an bestimmten Wochentagen sein.",

  // --- Sleep ---
  "Manual sleep tracking, scores and your personal pattern.":
    "Manuelles Schlaf-Tracking, Scores und dein persönliches Muster.",
  "Last night": "Letzte Nacht",
  Logged: "Eingetragen",
  Bedtime: "Zubettgehen",
  "Wake time": "Aufwachen",
  "Fall-asleep (min)": "Einschlafen (Min)",
  Awakenings: "Aufwachphasen",
  Quality: "Qualität",
  "Morning energy": "Energie morgens",
  Duration: "Dauer",
  "Avg duration": "Ø Dauer",
  Target: "Ziel",
  "Bedtime var.": "Zubett-Varianz",
  regular: "regelmäßig",
  variable: "variabel",
  "Duration · last 30 nights": "Dauer · letzte 30 Nächte",
  "Personal pattern": "Persönliches Muster",
  "From your data": "Aus deinen Daten",
  "Log a few nights to see your trend.": "Trage ein paar Nächte ein, um deinen Trend zu sehen.",
  "Your best-rated mornings follow around {dur} of sleep (avg morning energy {energy}/10 in that range).":
    "Deine am besten bewerteten Morgen folgen auf etwa {dur} Schlaf (Ø Morgenenergie {energy}/10 in diesem Bereich).",
  "A data-based estimate from your own logs — not a medical recommendation.":
    "Eine datenbasierte Schätzung aus deinen eigenen Daten — keine medizinische Empfehlung.",
  "Not enough data yet for a reliable pattern. Keep logging — an estimate appears after ~10 nights.":
    "Noch nicht genug Daten für ein verlässliches Muster. Trage weiter ein — eine Schätzung erscheint nach ~10 Nächten.",

  // --- Statistics ---
  "Trends, ratings and correlations from your data.":
    "Trends, Ratings und Korrelationen aus deinen Daten.",
  "Life Rating (ELO)": "Life Rating (ELO)",
  Current: "Aktuell",
  "Personal best": "Persönliche Bestleistung",
  "30-day": "30 Tage",
  "90-day": "90 Tage",
  "All-time": "Insgesamt",
  "Life Score by weekday": "Life Score nach Wochentag",
  "What your data suggests": "Was deine Daten nahelegen",
  Correlations: "Korrelationen",
  "Associations observed in your logs — correlation, not causation.":
    "In deinen Daten beobachtete Zusammenhänge — Korrelation, keine Kausalität.",
  "Not enough data in this range yet.":
    "Noch nicht genug Daten in diesem Zeitraum.",
  avg: "Ø",

  // --- Journal ---
  "Private by default. Stored only on this device.":
    "Standardmäßig privat. Nur auf diesem Gerät gespeichert.",
  "New entry": "Neuer Eintrag",
  "Search entries…": "Einträge durchsuchen…",
  "No entries found.": "Keine Einträge gefunden.",
  Untitled: "Ohne Titel",
  "Open or start an entry": "Eintrag öffnen oder beginnen",
  "Your journal reads like a book — one page per day. Pick an entry on the left or start a new one.":
    "Dein Tagebuch liest sich wie ein Buch — eine Seite pro Tag. Wähle links einen Eintrag oder beginne einen neuen.",
  "Title your day…": "Benenne deinen Tag…",
  "Write freely…": "Schreib frei…",
  "Highlight of the day": "Highlight des Tages",
  "Mood (1–10)": "Stimmung (1–10)",
  Location: "Ort",
  Weather: "Wetter",
  "Tags (comma separated)": "Tags (kommagetrennt)",
  "Add photo": "Foto hinzufügen",

  // --- Goals ---
  "Longer-term outcomes, distinct from daily habits.":
    "Längerfristige Ziele, getrennt von täglichen Gewohnheiten.",
  "New goal": "Neues Ziel",
  "Edit goal": "Ziel bearbeiten",
  "No goals yet": "Noch keine Ziele",
  Deadline: "Frist",
  Milestones: "Meilensteine",
  "Add a milestone…": "Meilenstein hinzufügen…",
  "Create goal": "Ziel erstellen",
  "Linked habits": "Verknüpfte Gewohnheiten",
  "Habits that contribute to this goal.": "Gewohnheiten, die auf dieses Ziel einzahlen.",
  'A habit is "train 3× / week". A goal is "bench 80kg by December". Add milestones to track progress.':
    'Eine Gewohnheit ist "3× / Woche trainieren". Ein Ziel ist "80kg Bankdrücken bis Dezember". Füge Meilensteine hinzu, um den Fortschritt zu verfolgen.',
  Career: "Karriere",
  Personal: "Persönlich",

  // --- Settings ---
  "Tune what you track and how your score is computed.":
    "Passe an, was du trackst und wie dein Score berechnet wird.",
  "Account & sync": "Konto & Sync",
  "Sign in to keep the same data on your phone and PC.":
    "Melde dich an, um auf Handy und PC denselben Datenstand zu haben.",
  "Same data on all your devices.": "Gleicher Datenstand auf allen Geräten.",
  "Signed in as": "Angemeldet als",
  "Sign in": "Anmelden",
  "Sign out": "Abmelden",
  "Create account": "Konto erstellen",
  "Have an account? Sign in": "Schon ein Konto? Anmelden",
  "Account created — you can sign in now.": "Konto erstellt — du kannst dich jetzt anmelden.",
  Email: "E-Mail",
  Password: "Passwort",
  "Sync now": "Jetzt synchronisieren",
  "Syncing…": "Synchronisiere…",
  Synced: "Synchronisiert",
  "Sync error": "Sync-Fehler",
  Appearance: "Darstellung",
  Accent: "Akzentfarbe",
  Calm: "Calm",
  Aurora: "Aurora",
  Mono: "Mono",
  Light: "Hell",
  Dark: "Dunkel",
  System: "System",
  Language: "Sprache",
  English: "Englisch",
  German: "Deutsch",
  Profile: "Profil",
  "Used to personalize the app and enrich your stats. Optional and private.":
    "Wird zur Personalisierung und für reichhaltigere Statistiken genutzt. Optional und privat.",
  Age: "Alter",
  Sex: "Geschlecht",
  "Height (cm)": "Größe (cm)",
  "Current weight (kg)": "Aktuelles Gewicht (kg)",
  "Activity level": "Aktivitätslevel",
  BMI: "BMI",
  years: "Jahre",
  male: "männlich",
  female: "weiblich",
  other: "divers",
  prefer_not: "keine Angabe",
  sedentary: "wenig aktiv",
  light: "leicht aktiv",
  moderate: "moderat aktiv",
  active: "aktiv",
  athlete: "sehr aktiv",
  "Weight trend": "Gewichtsverlauf",
  "Log weight": "Gewicht eintragen",
  "Life areas & score weights": "Lebensbereiche & Score-Gewichte",
  "normalized to 100%": "auf 100% normalisiert",
  "manual only": "nur manuell",
  "Sleep target": "Schlafziel",
  hours: "Stunden",
  Data: "Daten",
  "Last backup": "Letztes Backup",
  "No backup yet": "Noch kein Backup",
  "1 day ago": "vor 1 Tag",
  "{n} days ago": "vor {n} Tagen",
  "Your data lives only in this browser. Export a backup regularly so you never lose it.":
    "Deine Daten liegen nur in diesem Browser. Exportiere regelmäßig ein Backup, damit du sie nie verlierst.",
  "Your data lives only in this browser. Export a backup so you don't lose it.":
    "Deine Daten liegen nur in diesem Browser. Exportiere ein Backup, damit du sie nicht verlierst.",
  "Back up now": "Jetzt sichern",
  Dismiss: "Schließen",
  // reminders
  Reminders: "Erinnerungen",
  "A daily nudge to log your day. Works only while the app is open (no background push).":
    "Ein täglicher Anstoß, deinen Tag einzutragen. Funktioniert nur, solange die App geöffnet ist (kein Hintergrund-Push).",
  "Notifications aren't supported here.": "Benachrichtigungen werden hier nicht unterstützt.",
  "Enable notifications": "Benachrichtigungen aktivieren",
  "Daily check-in reminder": "Tägliche Check-in-Erinnerung",
  "Reminder time": "Erinnerungszeit",
  "Include still-open habits": "Offene Gewohnheiten einbeziehen",
  "Life Dashboard — daily check-in": "Life Dashboard — täglicher Check-in",
  "{n} goals still open — take a minute to log your day.":
    "{n} Ziele noch offen — nimm dir kurz Zeit, deinen Tag einzutragen.",
  "Take a minute to log your day.": "Nimm dir kurz Zeit, deinen Tag einzutragen.",
  "Load demo data": "Demo-Daten laden",
  "Clear demo data": "Demo-Daten löschen",
  "Export JSON": "JSON exportieren",
  "Import JSON": "JSON importieren",
  "Reset everything": "Alles zurücksetzen",
  "This deletes all data and restarts onboarding.":
    "Das löscht alle Daten und startet das Onboarding neu.",
  "Confirm reset": "Zurücksetzen bestätigen",
  Roadmap: "Roadmap",
  "Life Dashboard · your data lives in this browser only.":
    "Life Dashboard · deine Daten leben nur in diesem Browser.",

  // --- Onboarding ---
  "Which areas matter to you?": "Welche Bereiche sind dir wichtig?",
  "About you": "Über dich",
  "Optional and private — used to personalize the app and your stats.":
    "Optional und privat — zur Personalisierung der App und deiner Statistiken.",
  "A few targets": "Ein paar Ziele",
  "Start with data?": "Mit Daten starten?",
  "Explore with demo data": "Mit Demo-Daten erkunden",
  "Recommended for a first look": "Empfohlen für den ersten Blick",
  "Start clean": "Sauber starten",
  "A handful of starter habits, no history":
    "Ein paar Start-Gewohnheiten, keine Historie",
  "Everything is stored locally in your browser. Nothing is sent anywhere.":
    "Alles wird lokal in deinem Browser gespeichert. Nichts wird irgendwohin gesendet.",
  "Pick what you want to track. You can change any of this later — turning an area off keeps your dashboard focused.":
    "Wähle, was du tracken möchtest. Du kannst das später jederzeit ändern — Bereiche auszuschalten hält dein Dashboard fokussiert.",
  "These seed your goals. Nothing here is a medical recommendation — just your own targets to measure against.":
    "Diese legen deine Ziele fest. Nichts davon ist eine medizinische Empfehlung — nur deine eigenen Richtwerte.",
  "Load 45 days of realistic demo data to explore charts, ELO and insights right away — or start clean with a few starter habits. Demo data can be cleared any time in Settings.":
    "Lade 45 Tage realistische Demo-Daten, um Charts, ELO und Insights sofort zu erkunden — oder starte sauber mit ein paar Start-Gewohnheiten. Demo-Daten lassen sich jederzeit in den Einstellungen löschen.",
  // area descriptions
  "Focus & deep work": "Fokus & konzentriertes Arbeiten",
  "Training & movement": "Training & Bewegung",
  "Rest & recovery": "Ruhe & Erholung",
  "Build & reduce behaviors": "Verhalten aufbauen & reduzieren",
  "Study & skills": "Lernen & Fähigkeiten",
  "Projects & making": "Projekte & Kreatives",
  "Daily check-ins & mood": "Tägliche Check-ins & Stimmung",
  "Net worth & spending": "Vermögen & Ausgaben",

  // --- Finances ---
  "Net worth, portfolio and budget. Values are entered manually.":
    "Nettovermögen, Depot und Budget. Werte werden manuell eingegeben.",
  "Net worth": "Nettovermögen",
  Assets: "Vermögen",
  Liabilities: "Schulden",
  "Investments value": "Wert Investments",
  Overview: "Übersicht",
  Portfolio: "Depot",
  Budget: "Haushaltsbuch",
  Accounts: "Konten",
  "Add account": "Konto hinzufügen",
  "Add liability": "Schuld hinzufügen",
  "Add holding": "Position hinzufügen",
  "Add transaction": "Buchung hinzufügen",
  "No accounts yet": "Noch keine Konten",
  "No holdings yet": "Noch keine Positionen",
  "No transactions yet": "Noch keine Buchungen",
  Ticker: "Ticker",
  Quantity: "Anzahl",
  "Buy price": "Kaufpreis",
  "Current price": "Aktueller Preis",
  "Monthly plan": "Sparplan / Monat",
  Value: "Wert",
  "Gain / Loss": "Gewinn / Verlust",
  Allocation: "Allokation",
  "Total value": "Gesamtwert",
  "Total invested": "Investiert gesamt",
  "Total gain": "Gesamtgewinn",
  "Monthly income": "Monatl. Einnahmen",
  "Monthly expenses": "Monatl. Ausgaben",
  "Savings rate": "Sparquote",
  Income: "Einnahmen",
  Expense: "Ausgabe",
  Expenses: "Ausgaben",
  "This month": "Dieser Monat",
  "Net worth over time": "Nettovermögen über Zeit",
  Balance: "Saldo",
  "Monthly payment": "Monatliche Rate",
  Currency: "Währung",
  "Market prices are entered manually. A live-data provider can be added later without changing this screen.":
    "Marktpreise werden manuell eingegeben. Ein Live-Daten-Anbieter kann später ohne Änderung dieses Bildschirms ergänzt werden.",
  "Information, not investment advice.":
    "Information, keine Anlageberatung.",
  Diversification: "Diversifikation",
  "Concentration risk": "Konzentrationsrisiko",
  "Well diversified": "Gut diversifiziert",
  "Concentrated — one position dominates":
    "Konzentriert — eine Position dominiert",

  // --- Training ---
  "Detailed workout logging with exercises, sets and metrics.":
    "Detailliertes Workout-Logging mit Übungen, Sätzen und Metriken.",
  "Log workout": "Workout eintragen",
  "New workout": "Neues Workout",
  "No workouts yet": "Noch keine Workouts",
  Sport: "Sport",
  "Duration (min)": "Dauer (Min)",
  Intensity: "Intensität",
  Performance: "Leistung",
  Fun: "Spaß",
  "Energy before": "Energie vorher",
  "Energy after": "Energie danach",
  "Distance (km)": "Distanz (km)",
  "Avg pulse": "Ø Puls",
  Exercises: "Übungen",
  "Add exercise": "Übung hinzufügen",
  "Exercise name": "Übungsname",
  Sets: "Sätze",
  "Add set": "Satz hinzufügen",
  Reps: "Wdh.",
  "Weight (kg)": "Gewicht (kg)",
  Notes: "Notizen",
  "Sessions this week": "Einheiten diese Woche",
  "Total time": "Gesamtzeit",
  "Avg performance": "Ø Leistung",
  "Recent workouts": "Letzte Workouts",
  Volume: "Volumen",

  // --- Projects / boards ---
  "Track learning topics and creative projects from idea to done.":
    "Verfolge Lernthemen und kreative Projekte von der Idee bis fertig.",
  "New project": "Neues Projekt",
  Learning: "Lernen",
  Creative: "Kreativ",
  "No projects in this board yet": "Noch keine Projekte in diesem Board",
  "Move left": "Nach links",
  "Move right": "Nach rechts",
  Backlog: "Backlog",
  Review: "Wiederholung",
  Mastered: "Gemeistert",
  Idea: "Idee",
  Draft: "Entwurf",
  Recording: "Aufnahme",
  Mixing: "Mixing",

  // --- Achievements ---
  "Milestones and personal records from your data.":
    "Meilensteine und persönliche Rekorde aus deinen Daten.",
  Unlocked: "Freigeschaltet",
  Locked: "Gesperrt",
  "Personal records": "Persönliche Rekorde",
  "Keep logging to unlock more.":
    "Trage weiter ein, um mehr freizuschalten.",
  // achievement titles/descriptions
  "First steps": "Erste Schritte",
  "Log your first day": "Trage deinen ersten Tag ein",
  Consistent: "Konstant",
  "7-day activity streak": "7-Tage-Aktivitäts-Streak",
  Unstoppable: "Unaufhaltsam",
  "30-day activity streak": "30-Tage-Aktivitäts-Streak",
  "Peak day": "Spitzentag",
  "Reach a Life Score of 90": "Erreiche einen Life Score von 90",
  Rising: "Im Aufstieg",
  "Reach 1100 Life Rating": "Erreiche 1100 Life Rating",
  Elite: "Elite",
  "Reach 1300 Life Rating": "Erreiche 1300 Life Rating",
  "Getting strong": "Wird stark",
  "Log 10 workouts": "Trage 10 Workouts ein",
  "Iron discipline": "Eiserne Disziplin",
  "Log 50 workouts": "Trage 50 Workouts ein",
  Scholar: "Gelehrter",
  "Study 100 hours": "Lerne 100 Stunden",
  Chronicler: "Chronist",
  "Write 30 journal entries": "Schreibe 30 Tagebucheinträge",
  "Well rested": "Gut erholt",
  "Average 8h sleep over a week": "Ø 8h Schlaf über eine Woche",
  Saver: "Sparer",
  "Hit a 30% savings rate in a month": "Erreiche 30% Sparquote in einem Monat",
  "In the black": "In den schwarzen Zahlen",
  "Reach a positive net worth": "Erreiche ein positives Nettovermögen",
  "Goal getter": "Zielerreicher",
  "Complete a goal": "Schließe ein Ziel ab",
  // record labels
  "Highest Life Score": "Höchster Life Score",
  "Highest Life Rating": "Höchstes Life Rating",
  "Longest streak": "Längster Streak",
  "Best sleep week": "Beste Schlafwoche",
  "Highest monthly savings rate": "Höchste monatliche Sparquote",
  "Most workouts in a week": "Meiste Workouts in einer Woche",

  // --- Reports ---
  "Automatic summaries of your week and month.":
    "Automatische Zusammenfassungen deiner Woche und deines Monats.",
  Weekly: "Wöchentlich",
  Monthly: "Monatlich",
  "Life Report": "Life Report",
  "Share as image": "Als Bild teilen",
  "Best day": "Bester Tag",
  "Toughest day": "Härtester Tag",
  "Training sessions": "Trainingseinheiten",
  "Journal entries": "Tagebucheinträge",
  "vs previous": "ggü. vorher",
  "Not enough data for this period yet.":
    "Noch nicht genug Daten für diesen Zeitraum.",
  Highlights: "Highlights",
  "Your average Life Score improved {n} points versus the period before.":
    "Dein durchschnittlicher Life Score ist {n} Punkte besser als im Zeitraum davor.",
  "You trained {n} times — strong consistency.":
    "Du hast {n}-mal trainiert — starke Konstanz.",
  "Your sleep averaged {dur} this period.":
    "Dein Schlaf lag in diesem Zeitraum im Schnitt bei {dur}.",
  "Your best day scored {n}.": "Dein bester Tag erreichte {n}.",
  "Logged {n} days this period. Keep the momentum going.":
    "{n} Tage in diesem Zeitraum eingetragen. Bleib dran.",

  // --- Finance categories ---
  Bank: "Bank",
  Cash: "Bargeld",
  Investment: "Investment",
  Realestate: "Immobilie",
  Vehicle: "Fahrzeug",
  Other: "Sonstiges",
  Stock: "Aktie",
  Etf: "ETF",
  Fund: "Fonds",
  Crypto: "Krypto",
  Bond: "Anleihe",
  Groceries: "Lebensmittel",
  Restaurants: "Restaurants",
  Leisure: "Freizeit",
  Clothing: "Kleidung",
  Travel: "Reisen",
  Transport: "Mobilität",
  Subscriptions: "Abos",
  Insurance: "Versicherungen",
  Health: "Gesundheit",
  Investments: "Investments",
  Salary: "Gehalt",
  "Side income": "Nebeneinkommen",
  Gift: "Geschenk",
  Refund: "Erstattung",

  // --- Weekdays ---
  Monday: "Montag",
  Tuesday: "Dienstag",
  Wednesday: "Mittwoch",
  Thursday: "Donnerstag",
  Friday: "Freitag",
  Saturday: "Samstag",
  Sunday: "Sonntag",
  Mon: "Mo",
  Tue: "Di",
  Wed: "Mi",
  Thu: "Do",
  Fri: "Fr",
  Sat: "Sa",
  Sun: "So",

  // --- Insight templates (interpolated) ---
  "On nights you hit your sleep target, your rated productivity is about {pct}% higher.":
    "In Nächten, in denen du dein Schlafziel erreichst, ist deine bewertete Produktivität etwa {pct}% höher.",
  "Your productivity ratings don't rise with more sleep in this window — the pattern is weak so far.":
    "Deine Produktivitätswerte steigen in diesem Zeitraum nicht mit mehr Schlaf — das Muster ist bislang schwach.",
  "Your mood averages {diff} points higher (out of 10) on days you train.":
    "Deine Stimmung liegt an Trainingstagen im Schnitt {diff} Punkte höher (von 10).",
  "On days with a workout your Life Score is on average {diff} points higher.":
    "An Tagen mit Training ist dein Life Score im Schnitt {diff} Punkte höher.",
  "Your strongest days recently tend to be {a} and {b}.":
    "Deine stärksten Tage sind zuletzt meist {a} und {b}.",
  "{day}s show your reduce-habits about {pct}% above your average.":
    "An {day}en liegen deine Reduzier-Gewohnheiten etwa {pct}% über deinem Schnitt.",
  "Your 7-day Life Score is up {diff} points versus the week before — momentum is building.":
    "Dein 7-Tage-Life-Score ist {diff} Punkte höher als in der Vorwoche — der Schwung wächst.",
  "Your 7-day Life Score is down {diff} points versus the week before.":
    "Dein 7-Tage-Life-Score ist {diff} Punkte niedriger als in der Vorwoche.",
  "Not enough data yet for reliable insights. Keep logging — patterns appear after a couple of weeks.":
    "Noch nicht genug Daten für verlässliche Insights. Trage weiter ein — Muster zeigen sich nach ein paar Wochen.",

  // --- Experiments (retrospective) ---
  "last {n} days": "letzte {n} Tage",
  "Optional — a name is generated if you leave this empty.":
    "Optional — wenn leer, wird automatisch ein Name erzeugt.",
  "e.g. Sleep vs. productivity": "z. B. Schlaf vs. Produktivität",
  "Analyze the last N days": "Die letzten N Tage auswerten",
  "Looks back over your existing history, so results appear right away.":
    "Wertet deine bestehende Historie aus, dadurch erscheinen Ergebnisse sofort.",

  // --- Day-flow overlays ---
  "End of day": "Tagesabschluss",
  Skip: "Überspringen",
  "Did you reach today's goals?": "Hast du deine heutigen Ziele erreicht?",
  "Bad habits kept in check?": "Schlechte Gewohnheiten im Griff?",
  "How was your day?": "Wie war dein Tag?",
  "Your day at a glance": "Dein Tag auf einen Blick",
  "Compared to yesterday": "Vergleich zum Vortag",
  "One more journal note?": "Noch ein Tagebuch-Eintrag?",
  "Tick what you actually did. Nothing here overwrites earlier entries.":
    "Hak ab, was du wirklich gemacht hast. Nichts hier überschreibt frühere Einträge.",
  "No score for yesterday to compare against yet.":
    "Noch kein Score von gestern zum Vergleichen.",
  Yesterday: "Gestern",
  points: "Punkte",
  "Right on par with yesterday.": "Genau auf dem Niveau von gestern.",
  "A stronger day than yesterday — nice work.":
    "Ein stärkerer Tag als gestern — stark gemacht.",
  "A quieter day than yesterday. Tomorrow's a fresh start.":
    "Ein ruhigerer Tag als gestern. Morgen ist ein neuer Anfang.",
  "Optional — a sentence about today. Existing journal entries are untouched.":
    "Optional — ein Satz zum heutigen Tag. Bestehende Tagebuch-Einträge bleiben unangetastet.",
  "What's worth remembering about today?": "Was ist an heute erinnerungswürdig?",
  "Log last night's sleep, {name}.": "Trag den Schlaf der letzten Nacht ein, {name}.",
  "Log last night's sleep.": "Trag den Schlaf der letzten Nacht ein.",

  // --- Settings: daily routines & feedback ---
  "Daily routines": "Tägliche Abläufe",
  "Short guided screens that pop up once a day to help you log quickly. They never remove anything you already entered.":
    "Kurze geführte Screens, die einmal am Tag erscheinen, damit du schnell einträgst. Sie löschen nie etwas, das du schon eingetragen hast.",
  "End-of-day wrap-up": "Tagesabschluss",
  "Goals, check-in, day recap & journal.": "Ziele, Check-in, Tagesrückblick & Tagebuch.",
  From: "Von",
  Until: "Bis",
  "Good-morning sleep prompt": "Guten-Morgen-Schlaf-Abfrage",
  "Just logs last night's sleep.": "Trägt nur den Schlaf der letzten Nacht ein.",
  "Bugs & feedback": "Fehler & Feedback",
  "Hit a bug or have an idea? Send it straight to the developer — this opens your email app.":
    "Fehler entdeckt oder eine Idee? Schick es direkt an den Entwickler — das öffnet deine E-Mail-App.",
  "Idea / feedback": "Idee / Feedback",
  "Bug report": "Fehlerbericht",
  "What happened? What did you expect?": "Was ist passiert? Was hast du erwartet?",
  "What would make this better?": "Was würde es besser machen?",
  "Send email": "E-Mail senden",
  "Sent from Life Dashboard": "Gesendet aus Life Dashboard",

  // --- Recap animations ---
  "Weekly recap": "Wochenrückblick",
  "Monthly recap": "Monatsrückblick",
  "Average Life Score": "Durchschnittlicher Life Score",
  "Days logged": "Tage eingetragen",
  "Avg sleep": "Ø Schlaf",
  "Top area": "Top-Bereich",
  "Habit completion": "Gewohnheiten erfüllt",
  "Nice!": "Stark!",
  "Play recap": "Rückblick abspielen",
  "Weekly & monthly recap": "Wochen- & Monatsrückblick",
  "An animated summary on Sundays and the 1st.": "Eine animierte Zusammenfassung sonntags und am 1.",

  // --- Analysis ---
  Analysis: "Analyse",
  "Everything you log, cross-analysed — patterns, connections and suggestions.":
    "Alles, was du einträgst, kategorienübergreifend ausgewertet — Muster, Zusammenhänge und Vorschläge.",
  "Overall read": "Gesamtbild",
  "vs last week": "ggü. letzter Woche",
  Recommendations: "Empfehlungen",
  "What's working": "Was gut läuft",
  Connections: "Zusammenhänge",
  "Watch-outs": "Worauf achten",
  "Not enough to analyse yet": "Noch zu wenig zum Auswerten",
  "Keep logging days, sleep and workouts — connections appear after a week or two.":
    "Trage weiter Tage, Schlaf und Workouts ein — Zusammenhänge zeigen sich nach ein bis zwei Wochen.",
  "Observations from your own data — associations, not medical or causal advice.":
    "Beobachtungen aus deinen eigenen Daten — Zusammenhänge, keine medizinische oder kausale Beratung.",
  Steady: "Solide",
  Building: "Im Aufbau",
  "Sleep ↔ productivity": "Schlaf ↔ Produktivität",
  "More sleep isn't lifting your productivity in this window — the link is weak so far.":
    "Mehr Schlaf hebt deine Produktivität in diesem Zeitraum nicht — der Zusammenhang ist bisher schwach.",
  "Sleep ↔ mood": "Schlaf ↔ Stimmung",
  "Your mood averages {diff} points higher (out of 10) after hitting your sleep target.":
    "Deine Stimmung ist im Schnitt {diff} Punkte höher (von 10), wenn du dein Schlafziel erreichst.",
  "Training ↔ Life Score": "Training ↔ Life Score",
  "On days you train, your Life Score is on average {diff} points higher.":
    "An Tagen, an denen du trainierst, ist dein Life Score im Schnitt {diff} Punkte höher.",
  "Training ↔ mood": "Training ↔ Stimmung",
  "Your mood runs {diff}/10 higher on training days.":
    "Deine Stimmung ist an Trainingstagen {diff}/10 höher.",
  "Slip days ↔ mood": "Ausrutscher ↔ Stimmung",
  "On days you slip on a reduce-habit, your mood is about {diff}/10 lower.":
    "An Tagen mit einem Ausrutscher bei einer Reduzier-Gewohnheit ist deine Stimmung rund {diff}/10 niedriger.",
  "Journaling ↔ mood": "Tagebuch ↔ Stimmung",
  "Days you journal tend to come with a {diff}/10 higher mood.":
    "Tage mit Tagebuch-Eintrag gehen mit einer {diff}/10 höheren Stimmung einher.",
  "Your biggest lever": "Dein größter Hebel",
  "Days you do “{name}” average {diff} Life-Score points higher than days you don't — protect this one.":
    "Tage mit „{name}“ haben im Schnitt {diff} Life-Score-Punkte mehr als Tage ohne — halt daran fest.",
  "Strongest area": "Stärkster Bereich",
  "{area} is your strongest area lately, averaging {m}/100.":
    "{area} ist zuletzt dein stärkster Bereich mit Ø {m}/100.",
  "Area to lift": "Bereich mit Potenzial",
  "{area} is trailing at {m}/100 — a small, specific habit here would move your overall score most.":
    "{area} hinkt bei {m}/100 hinterher — eine kleine, konkrete Gewohnheit hier würde deinen Gesamt-Score am meisten heben.",
  "{area} is climbing": "{area} steigt",
  "{area} is up {d} points versus the previous week.": "{area} ist {d} Punkte höher als in der Vorwoche.",
  "{area} is slipping": "{area} fällt",
  "{area} dropped {d} points versus the previous week.": "{area} ist {d} Punkte niedriger als in der Vorwoche.",
  "Low adherence": "Niedrige Einhaltung",
  "“{name}” is only at {pct}% lately. Either shrink the goal so it's easy to win, or schedule a fixed time for it.":
    "„{name}“ liegt zuletzt nur bei {pct}%. Verkleinere entweder das Ziel, damit es leicht zu schaffen ist, oder plane eine feste Zeit dafür ein.",
  "Sleep is short": "Schlaf ist knapp",
  "You're averaging {avg} vs your {target} target — about {debt} min short a night. Going to bed {debt} min earlier is the easiest fix.":
    "Du liegst im Schnitt bei {avg} statt deinem Ziel von {target} — etwa {debt} Min pro Nacht zu wenig. {debt} Min früher ins Bett ist die einfachste Lösung.",
  "Irregular bedtime": "Unregelmäßige Schlafenszeit",
  "Your bedtime swings by ±{sd} min. A more regular schedule usually improves sleep quality more than total hours.":
    "Deine Schlafenszeit schwankt um ±{sd} Min. Ein regelmäßigerer Rhythmus verbessert die Schlafqualität meist mehr als die reine Stundenzahl.",
  "Weekday rhythm": "Wochen-Rhythmus",
  "{best} are your strongest days and {worst} your weakest ({gap} points apart). Plan demanding things for {best}.":
    "{best} sind deine stärksten und {worst} deine schwächsten Tage ({gap} Punkte Unterschied). Plane Anspruchsvolles für {best}.",
  "Consistent logging": "Konstantes Eintragen",
  "You've logged {n} days in a row — consistency is what makes all of this analysis sharper.":
    "Du hast {n} Tage in Folge eingetragen — Konstanz macht diese ganze Analyse schärfer.",
  "Log a week or two of days and this analysis fills in with cross-connections and suggestions.":
    "Trage ein bis zwei Wochen ein, dann füllt sich diese Analyse mit Querverbindungen und Vorschlägen.",
  "trending up": "steigend",
  "trending down": "fallend",
  "holding steady": "stabil",
  "Your 7-day score is {score} ({trend}).": "Dein 7-Tage-Score liegt bei {score} ({trend}).",
  "Working for you: {s}": "Das läuft für dich: {s}",
  "Focus next: {w}": "Als Nächstes im Fokus: {w}",

  // --- Exercise picker ---
  "Choose exercise": "Übung wählen",
  "Search exercises…": "Übungen suchen…",
  "Start typing to search.": "Tippe, um zu suchen.",
  Use: "Nutze",

  // --- Training module ---
  "Plan workouts, log sets and track strength progress.":
    "Plane Workouts, tracke Sätze und deinen Kraftfortschritt.",
  Workouts: "Workouts",
  Plans: "Pläne",
  "Your plans": "Deine Pläne",
  "New plan": "Neuer Plan",
  "Edit plan": "Plan bearbeiten",
  "Plan name": "Plan-Name",
  "Create a plan (e.g. Push / Pull / Legs) so you can start a workout in one tap.":
    "Erstelle einen Plan (z. B. Push / Pull / Legs), um ein Workout mit einem Tipp zu starten.",
  "No exercises yet": "Noch keine Übungen",
  "Start workout": "Workout starten",
  Templates: "Vorlagen",
  "Add a ready-made split, then customise it.": "Füge einen fertigen Split hinzu und passe ihn an.",
  "Exercise progress": "Übungs-Fortschritt",
  "Estimated 1RM": "Geschätztes 1RM",
  "Log this exercise on at least two days to see a trend.":
    "Trage diese Übung an mindestens zwei Tagen ein, um einen Trend zu sehen.",
  "Volume by muscle group": "Volumen nach Muskelgruppe",
  "No sets logged in the last 30 days.": "In den letzten 30 Tagen keine Sätze eingetragen.",
  sets: "Sätze",
  "No progress data yet": "Noch keine Fortschrittsdaten",
  "Log a few workouts with weights and reps to see your strength trend per exercise and muscle group.":
    "Trage ein paar Workouts mit Gewicht und Wiederholungen ein, um deinen Kraft-Trend pro Übung und Muskelgruppe zu sehen.",
  "Edit workout": "Workout bearbeiten",
  Actual: "Ist",
  reps: "Wdh",
  "Remove set": "Satz entfernen",
  // muscle groups
  Chest: "Brust",
  "Back / Lats": "Rücken",
  Shoulders: "Schultern",
  Biceps: "Bizeps",
  Triceps: "Trizeps",
  Quads: "Quadrizeps",
  Hamstrings: "Beinbeuger",
  Glutes: "Gesäß",
  Calves: "Waden",
  Core: "Core",
  Forearms: "Unterarme",
  Traps: "Trapez",
  "Full body": "Ganzkörper",
  Cardio: "Cardio",

  // --- Scoreboard ---
  Scoreboard: "Rangliste",
  "Compare your Life Score with others.": "Vergleiche deinen Life Score mit anderen.",
  "Cloud sync required": "Cloud-Sync erforderlich",
  "The scoreboard needs the Supabase setup so scores can be shared. Set it up in Settings first.":
    "Die Rangliste braucht das Supabase-Setup, damit Scores geteilt werden können. Richte es zuerst in den Einstellungen ein.",
  "Open Settings": "Einstellungen öffnen",
  "Sign in to compete": "Zum Mitmachen anmelden",
  "Sign in with your account in Settings, then publish your scores here.":
    "Melde dich mit deinem Konto in den Einstellungen an und veröffentliche dann hier deine Scores.",
  "Your entry": "Dein Eintrag",
  "Display name": "Anzeigename",
  "How others see you": "Wie andere dich sehen",
  "Global ranking": "Globale Rangliste",
  "Update my scores": "Meine Scores aktualisieren",
  "Publish my scores": "Meine Scores veröffentlichen",
  "Publishing your current 7-day average": "Veröffentlicht deinen aktuellen 7-Tage-Schnitt",
  Overall: "Gesamt",
  "Your scores are live.": "Deine Scores sind live.",
  Leagues: "Ligen",
  "Create a league and share its code, or join one with a friend's code.":
    "Erstelle eine Liga und teile ihren Code, oder tritt mit dem Code eines Freundes bei.",
  "New league name": "Name der neuen Liga",
  "Join code": "Beitritts-Code",
  Join: "Beitreten",
  "League created. Share the code: {code}": "Liga erstellt. Teile den Code: {code}",
  "Joined {name}.": "„{name}“ beigetreten.",
  "No league found for that code.": "Keine Liga für diesen Code gefunden.",
  Global: "Global",
  Refresh: "Aktualisieren",
  "Loading…": "Lädt…",
  "No one on the global board yet. Turn on “Global ranking” above and publish.":
    "Noch niemand in der globalen Rangliste. Aktiviere oben „Globale Rangliste“ und veröffentliche.",
  "No scores in this league yet. Share the code so friends can join and publish.":
    "Noch keine Scores in dieser Liga. Teile den Code, damit Freunde beitreten und veröffentlichen.",
  You: "Du",
  "Your rank": "Dein Rang",
  of: "von",

  // --- Habit daily target ---
  "Daily target (optional)": "Tagesziel (optional)",
  "No target": "Kein Ziel",
  "Times per day": "Mal pro Tag",
  Minutes: "Minuten",
  "Custom value": "Eigener Wert",
  "Fewer than the target counts partially; more gives a small bonus.":
    "Weniger als das Ziel zählt anteilig; mehr gibt einen kleinen Bonus.",
  "e.g. 30": "z. B. 30",
  "per day": "pro Tag",
  Less: "Weniger",

  // --- Strava ---
  "Connect Strava to import your runs, rides and workouts automatically.":
    "Verbinde Strava, um deine Läufe, Radtouren und Workouts automatisch zu importieren.",
  "Connect Strava": "Strava verbinden",
  Connected: "Verbunden",
  "Your Strava activities show up as workouts.": "Deine Strava-Aktivitäten erscheinen als Workouts.",
  "Last activity synced": "Letzte synchronisierte Aktivität",
  Disconnect: "Trennen",
  "Connected. Imported {n} activities.": "Verbunden. {n} Aktivitäten importiert.",
  "Synced. {n} new activities ({skipped} already imported).":
    "Synchronisiert. {n} neue Aktivitäten ({skipped} schon importiert).",
  "Strava connection was cancelled.": "Strava-Verbindung wurde abgebrochen.",

  // --- Apple Health import ---
  "Apple Health import": "Apple-Health-Import",
  "Bring in sleep, weight and workouts from Apple Health. On your iPhone: Health app → your photo → “Export All Health Data”, unzip it, then upload the export.xml here.":
    "Hol dir Schlaf, Gewicht und Workouts aus Apple Health. Auf dem iPhone: Health-App → dein Foto → „Alle Gesundheitsdaten exportieren“, entpacken, dann die export.xml hier hochladen.",
  "Everything is parsed on your device. Existing days are never overwritten. (Apple has no live web sync — this is a manual import.)":
    "Alles wird auf deinem Gerät verarbeitet. Bestehende Tage werden nie überschrieben. (Apple bietet keinen Live-Web-Sync — das ist ein manueller Import.)",
  "Choose export.xml": "export.xml auswählen",
  "Importing…": "Importiere…",
  "Please unzip the export first and upload export.xml.":
    "Bitte entpacke den Export zuerst und lade die export.xml hoch.",
  "That doesn't look like an Apple Health export.xml.":
    "Das sieht nicht nach einer Apple-Health-export.xml aus.",
  "Imported {sleep} nights, {weight} weigh-ins, {workouts} workouts ({skipped} already present).":
    "{sleep} Nächte, {weight} Gewichtseinträge, {workouts} Workouts importiert ({skipped} schon vorhanden).",
  "Could not read that file. On very large exports, try again on a computer.":
    "Datei konnte nicht gelesen werden. Bei sehr großen Exporten versuch es an einem Computer.",

  // --- Custom experiments ---
  "My own condition": "Eigene Bedingung",
  "Or start from a template": "Oder mit einer Vorlage starten",
  "Name your condition": "Benenne deine Bedingung",
  "You mark the days it was true — then compare your metric on those days vs. the rest.":
    "Du markierst die Tage, an denen sie zutraf — dann wird deine Metrik an diesen Tagen mit den übrigen verglichen.",
  "e.g. Nose healed · Meditated · No coffee": "z. B. Nase geheilt · Meditiert · Kein Kaffee",
  "Days “{label}” was true": "Tage, an denen „{label}“ zutraf",
  "Today ✓": "Heute ✓",
  "Mark today": "Heute markieren",
  condition: "Bedingung",

  // --- Onboarding account step ---
  "Sync across your devices": "Über deine Geräte synchronisieren",
  "Create an account to keep the same data on your phone and PC. Optional — you can also do this later in Settings.":
    "Erstelle ein Konto, um dieselben Daten auf Handy und PC zu haben. Optional — du kannst das auch später in den Einstellungen machen.",
  "Skip for now": "Erstmal überspringen",
};

const DICTS: Record<Language, Record<string, string>> = { en: {}, de: DE };

export function translate(lang: Language, key: string, vars?: Vars): string {
  const dict = DICTS[lang] ?? {};
  let out = dict[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return out;
}

export function useT() {
  const { data } = useStore();
  const lang = data.settings.language;
  return useCallback((key: string, vars?: Vars) => translate(lang, key, vars), [lang]);
}

export function useLang(): Language {
  const { data } = useStore();
  return data.settings.language;
}
