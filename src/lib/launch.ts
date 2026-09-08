"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `action` once when the page was opened from a homescreen shortcut carrying
 * `?<key>=<value>`, then strips the parameter so a reload doesn't fire it a second time.
 *
 * Reads `window.location` directly rather than `useSearchParams`: this only ever runs in the
 * browser, and the hook would push the whole page behind a Suspense boundary for a query
 * string that is only ever set by a launcher.
 */
export function useLaunchAction(key: string, value: string, action: () => void) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get(key) !== value) return;
    fired.current = true;
    params.delete(key);
    const rest = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    action();
  }, [key, value, action]);
}
