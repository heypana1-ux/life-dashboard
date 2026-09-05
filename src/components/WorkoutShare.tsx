"use client";

import { useMemo, useState } from "react";
import { Download, Image as ImageIcon, Share2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Workout } from "@/lib/types";
import { buildWorkoutCard, workoutImageName } from "@/lib/workoutCard";
import { renderWorkoutImage } from "@/lib/workoutImage";
import { Button, Modal } from "@/components/ui";

/*
  The share card for one session. The image is drawn on a canvas when the dialog opens, so
  what you see is exactly the file you get — there is no second, different render on download.
  It works for a workout that hasn't been saved yet (the review step of a live session) just
  as well as for one from months ago.

  Both triggers snapshot the workout on tap. The live runner rebuilds its Workout object on
  every tick, and without the snapshot the card would be redrawn once a second while open.
*/

function ShareDialog({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  // Mounted only on tap, so this render never happens on the server.
  const url = useMemo(
    () => (typeof document === "undefined" ? null : renderWorkoutImage(buildWorkoutCard(workout, t))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workout],
  );

  const filename = workoutImageName(workout);

  function download() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  /** Native share sheet where the browser has one — that's how this ends up in a chat. */
  async function share() {
    if (!url) return;
    setBusy(true);
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: workout.sport });
      else download();
    } catch {
      // A cancelled share sheet throws too — nothing to report, the dialog just stays open.
    } finally {
      setBusy(false);
    }
  }

  const canShare = typeof navigator !== "undefined" && !!navigator.canShare;

  return (
    <Modal open onClose={onClose} title={t("Workout image")}>
      <div className="space-y-3">
        <div className="max-h-[55vh] overflow-y-auto rounded-2xl border border-[var(--border)]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={t("Workout image")} className="block w-full" />
          ) : (
            <div className="h-40 animate-pulse bg-[var(--surface-2)]" />
          )}
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={download} disabled={!url}>
            <Download size={16} /> {t("Save image")}
          </Button>
          {canShare && (
            <Button variant="soft" onClick={share} disabled={!url || busy}>
              <Share2 size={16} /> {t("Share")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Icon-sized trigger for the workout list. */
export function WorkoutImageButton({ workout, className }: { workout: Workout; className?: string }) {
  const t = useT();
  const [shot, setShot] = useState<Workout | null>(null);
  return (
    <>
      <button
        onClick={() => setShot(workout)}
        aria-label={t("Workout image")}
        title={t("Workout image")}
        className={className ?? "rounded-lg p-1.5 text-[var(--text-faint)] hover:text-[var(--accent)]"}
      >
        <ImageIcon size={14} />
      </button>
      {shot && <ShareDialog workout={shot} onClose={() => setShot(null)} />}
    </>
  );
}

/** Full-width trigger for the end of a session. `build` is called once, on tap. */
export function WorkoutImageAction({ build }: { build: () => Workout }) {
  const t = useT();
  const [shot, setShot] = useState<Workout | null>(null);
  return (
    <>
      <Button variant="soft" className="w-full" onClick={() => setShot(build())}>
        <ImageIcon size={16} /> {t("Workout image")}
      </Button>
      {shot && <ShareDialog workout={shot} onClose={() => setShot(null)} />}
    </>
  );
}
