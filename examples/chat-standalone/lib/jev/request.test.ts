// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolveComposer } from "./request";

describe("resolveComposer", () => {
  it("keeps the live-tool agent unless composer is jev", () => {
    expect(resolveComposer({})).toEqual({ kind: "agent" });
    expect(resolveComposer({ composer: "openai" })).toEqual({ kind: "agent" });
    expect(resolveComposer({ mode: "state-fill" })).toEqual({ kind: "agent" });
  });

  it("selects Jev without constructing ToolLoopAgent", () => {
    expect(resolveComposer({ composer: "jev" })).toEqual({ kind: "jev" });
    expect(resolveComposer({ composer: "jev", mode: "generate" })).toEqual({
      kind: "jev",
    });
  });

  it("refuses Mode B state-fill on the Jev path", () => {
    expect(resolveComposer({ composer: "jev", mode: "state-fill" })).toEqual({
      kind: "jev-state-fill-refused",
    });
  });
});
