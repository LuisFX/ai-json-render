import { describe, expect, test } from "bun:test";

import {
  GRID_COLS_MAP,
  GRID_GAP_MAP,
  gridColumnClass,
  gridGapClass,
} from "./grid-classes";

describe("gridColumnClass", () => {
  test("maps 1-6 to static container-query class strings", () => {
    expect(gridColumnClass(1)).toBe("grid-cols-1");
    expect(gridColumnClass(2)).toBe("grid-cols-1 @md:grid-cols-2");
    expect(gridColumnClass(3)).toBe(
      "grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3",
    );
    expect(gridColumnClass(4)).toBe(
      "grid-cols-1 @md:grid-cols-2 @xl:grid-cols-4",
    );
    expect(gridColumnClass(5)).toBe(
      "grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-5",
    );
    expect(gridColumnClass(6)).toBe(
      "grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-6",
    );
  });

  test("clamps null, zero, and out-of-range to 1-6", () => {
    expect(gridColumnClass(null)).toBe(GRID_COLS_MAP[1]);
    expect(gridColumnClass(undefined)).toBe(GRID_COLS_MAP[1]);
    expect(gridColumnClass(0)).toBe(GRID_COLS_MAP[1]);
    expect(gridColumnClass(99)).toBe(GRID_COLS_MAP[6]);
  });

  test("every mapped string is a literal in GRID_COLS_MAP (Tailwind scan)", () => {
    for (const n of [1, 2, 3, 4, 5, 6] as const) {
      expect(GRID_COLS_MAP[n]).toBe(gridColumnClass(n));
      expect(GRID_COLS_MAP[n]).toContain("grid-cols-");
    }
  });
});

describe("gridGapClass", () => {
  test("matches shadcn gap tokens", () => {
    expect(gridGapClass("sm")).toBe("gap-2");
    expect(gridGapClass("md")).toBe("gap-3");
    expect(gridGapClass("lg")).toBe("gap-4");
    expect(gridGapClass("xl")).toBe("gap-6");
  });

  test("defaults unknown and missing gap to md", () => {
    expect(gridGapClass(null)).toBe(GRID_GAP_MAP.md);
    expect(gridGapClass(undefined)).toBe(GRID_GAP_MAP.md);
    expect(gridGapClass("xxl")).toBe("gap-3");
  });
});
