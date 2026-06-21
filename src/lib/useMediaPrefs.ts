"use client";

import { useEffect, useState } from "react";

function useMediaQuery(query: string, initial = false) {
  const [matches, setMatches] = useState(initial);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** True when the visitor asked the OS to reduce motion. */
export const useReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");

/** True on narrow viewports — used to drop 3D quality / switch to 2D. */
export const useIsCompact = () => useMediaQuery("(max-width: 820px)");
