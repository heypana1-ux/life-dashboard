import { AppData, Language } from "./types";
import { computeHistory } from "./score";
import { analyze } from "./analysis";
import { addDays, todayISO } from "./date";

/*
  Builds the short text delivered as the Sunday-evening weekly-recap push: the 7-day Life-Score
  average + trend, plus the single most relevant finding from the analysis engine. Computed on
  the client (which has the data) and stored server-side so the cron can send it verbatim.
*/
export function weeklyRecapText(data: AppData, language: Language): string {
  const lang: Language = language === "de" ? "de" : "en";
  const today = todayISO();
  const history = computeHistory(data, addDays(today, -70), today);
  const report = analyze(data, history, lang);
  const { score, trend } = report.verdict;

  if (!score) {
    return lang === "de"
      ? "Neue Woche — trag ein paar Tage ein, dann fasse ich sie dir zusammen."
      : "New week — log a few days and I'll sum it up for you.";
  }

  const arrow = trend > 0 ? "▲" : trend < 0 ? "▼" : "▬";
  const sign = trend > 0 ? "+" : "";
  const head =
    lang === "de"
      ? `Diese Woche: Ø ${score} (${arrow} ${sign}${trend}).`
      : `This week: avg ${score} (${arrow} ${sign}${trend}).`;
  const top = report.findings.find((f) => f.kind === "insight" || f.kind === "strength") ?? report.findings[0];
  const detail = top ? " " + top.detail : "";
  return (head + detail).slice(0, 280);
}
