"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { collectGarbage, dataUrlToBlob, isDataUrl, putImage } from "@/lib/photoStore";

/*
  Moves images that older versions inlined as data: URLs out of the JSON blob and into
  IndexedDB, then drops stored images nothing references any more.

  Runs once per session after hydration. It is deliberately forgiving: an image that can't be
  converted keeps its data URL and stays renderable, so a half-finished migration never costs
  the user a photo.
*/

export function MediaMigration() {
  const { data, ready, replaceAll } = useStore();
  const done = useRef(false);

  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;

    (async () => {
      let changed = false;

      const journal = await Promise.all(
        data.journal.map(async (entry) => {
          if (!entry.photos?.length || !entry.photos.some(isDataUrl)) return entry;
          const photos = await Promise.all(
            entry.photos.map(async (ref) => {
              if (!isDataUrl(ref)) return ref;
              const blob = dataUrlToBlob(ref);
              if (!blob) return ref;
              try {
                const next = await putImage(blob);
                changed = true;
                return next;
              } catch {
                return ref;
              }
            }),
          );
          return { ...entry, photos };
        }),
      );

      const visionItems = await Promise.all(
        data.visionItems.map(async (item) => {
          if (!item.image || !isDataUrl(item.image)) return item;
          const blob = dataUrlToBlob(item.image);
          if (!blob) return item;
          try {
            const image = await putImage(blob);
            changed = true;
            return { ...item, image };
          } catch {
            return item;
          }
        }),
      );

      if (changed) replaceAll({ ...data, journal, visionItems });

      // Reclaim space from entries deleted while offline, restored backups and imports.
      const referenced = [
        ...journal.flatMap((e) => e.photos ?? []),
        ...visionItems.map((v) => v.image).filter((x): x is string => !!x),
      ];
      void collectGarbage(referenced);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return null;
}
