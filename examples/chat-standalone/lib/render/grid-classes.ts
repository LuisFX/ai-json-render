/** Static class maps so Tailwind v4 can see every utility at scan time. */

export const GRID_COLS_MAP: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 @md:grid-cols-2",
  3: "grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3",
  4: "grid-cols-1 @md:grid-cols-2 @xl:grid-cols-4",
  5: "grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-5",
  6: "grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-6",
};

export const GRID_GAP_MAP: Record<string, string> = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-6",
};

export function gridColumnClass(columns?: number | null): string {
  const n = Math.max(1, Math.min(6, columns ?? 1));
  return GRID_COLS_MAP[n] ?? "grid-cols-1";
}

export function gridGapClass(gap?: string | null): string {
  return GRID_GAP_MAP[gap ?? "md"] ?? "gap-3";
}
