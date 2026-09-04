"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { getImage, isBlobRef } from "@/lib/photoStore";

/*
  Renders an image reference from the data model, which is either a legacy inline data: URL or
  an "idb:" reference into the local image store. Object URLs are revoked on unmount, so
  scrolling a long journal doesn't leak a blob per photo.

  A reference this device doesn't have (added on another device — image bytes are not synced
  yet) renders as a quiet placeholder rather than a broken image icon.
*/

export function StoredImage({
  src,
  alt = "",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const url = useImageUrl(src);

  if (url === null) {
    return (
      <span
        className={`flex items-center justify-center bg-[var(--surface-2)] text-[var(--text-dim)] ${className ?? ""}`}
        title={alt}
      >
        <ImageOff size={16} />
      </span>
    );
  }
  if (!url) return <span className={`animate-pulse bg-[var(--surface-2)] ${className ?? ""}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}

/** `undefined` while loading, `null` when the image isn't on this device, else a usable URL. */
export function useImageUrl(ref: string | undefined): string | null | undefined {
  // Only a blob reference needs resolving; a plain data:/http URL is already the answer, so it
  // is returned straight from render rather than copied into state.
  const needsLookup = !!ref && isBlobRef(ref);
  const [resolved, setResolved] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!needsLookup || !ref) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    getImage(ref).then((blob) => {
      if (cancelled) return;
      if (!blob) {
        setResolved(null);
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setResolved(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setResolved(undefined);
    };
  }, [ref, needsLookup]);

  if (!ref) return null;
  return needsLookup ? resolved : ref;
}
