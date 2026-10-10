"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string, defaultMatch = true): boolean {
  const [matches, setMatches] = useState(defaultMatch);

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
