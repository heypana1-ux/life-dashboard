"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { Card, PageHeader, SectionTitle, Button } from "@/components/ui";
import { CoachBriefing, CoachInsightCard, CoachWeeklyCheckin } from "@/components/Coach";
import { HeadsUpCard, InsightsCard, WeeklyFocusCard } from "@/components/AiCards";
import { WeeklyPlanner } from "@/components/WeeklyPlanner";

/*
  Everything the coach has to say about your data, on one screen.

  This is where the pieces that used to sit on the old customisable dashboard live now — the
  daily briefing, the weekly check-in, "heads up", insights, the week's focus and plan. The
  4a dashboard is deliberately a single focused screen, and burying these behind a tab on the
  Analysis page made them easy to miss, so they get their own entry next to Analysis instead.
*/

export default function AiAnalysisPage() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const coachOn = !!data.settings.aiCoachEnabled;
  const days = d.history.filter((h) => h.lifeScore > 0).length;

  return (
    <div className="space-y-[14px]">
      <PageHeader
        kicker={`${t("Coach")} · ${t("{n} days", { n: days })}`}
        lead={t("Your")}
        title={t("AI analysis")}
        subtitle={t("What your coach makes of your data — read together in one place.")}
      />

      {coachOn ? (
        <>
          <CoachBriefing />
          <CoachWeeklyCheckin />
          {/* A free-form read that isn't tied to one metric — the "so what?" of the rest. */}
          <CoachInsightCard
            title={t("The bigger picture")}
            prompt="Look across everything in my snapshot — score, sleep, training, habits, mood, focus and goals — and tell me the two or three things that matter most right now. Say what is going well, what is quietly slipping, and one concrete thing to do this week. Be specific and use my actual numbers."
          />
        </>
      ) : (
        <Card>
          <SectionTitle>{t("AI coach")}</SectionTitle>
          <p className="text-[13px] leading-[1.55] text-[var(--text-muted)]">
            {t("Turn the AI coach on in Settings to get a daily briefing and a weekly check-in here.")}
          </p>
          <Link href="/settings">
            <Button variant="soft" size="sm" className="mt-3">
              <Sparkles size={15} /> {t("Open settings")}
            </Button>
          </Link>
        </Card>
      )}

      <WeeklyFocusCard />
      <WeeklyPlanner />
      <HeadsUpCard />
      <InsightsCard />

      <p className="pb-4 text-center text-[10.5px] leading-[1.5] text-[var(--text-dim)]">
        {t("Observations from your own data — associations, not medical or causal advice.")}
      </p>
    </div>
  );
}
