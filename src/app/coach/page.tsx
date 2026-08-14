"use client";

import { PageHeader } from "@/components/ui";
import { CoachChat } from "@/components/Coach";
import { useT } from "@/lib/i18n";

export default function CoachPage() {
  const t = useT();
  return (
    <div className="flex min-h-[calc(100dvh-140px)] flex-col">
      <PageHeader title={t("Coach")} subtitle={t("Your data, interpreted. Ask anything.")} />
      <div className="card flex min-h-0 flex-1 flex-col">
        <CoachChat />
      </div>
    </div>
  );
}
