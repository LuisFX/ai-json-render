/**
 * Jev is a composer, not a ChatProvider. The generate route branches on this
 * before constructing ToolLoopAgent.
 */
export type ComposerKind =
  | { kind: "agent" }
  | { kind: "jev" }
  | { kind: "jev-state-fill-refused" };

export function resolveComposer(body: {
  composer?: unknown;
  mode?: unknown;
}): ComposerKind {
  if (body.composer !== "jev") return { kind: "agent" };
  if (body.mode === "state-fill") return { kind: "jev-state-fill-refused" };
  return { kind: "jev" };
}
