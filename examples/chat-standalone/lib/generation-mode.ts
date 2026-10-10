/**
 * Single switch for this example's json-render generation mode.
 * `pipeJsonRender` accepts both; flip to `"inline"` to restore prose in the
 * transcript while keeping the artifact sidebar.
 */
export const GENERATION_MODE = "standalone" as const;

export const EDIT_MODES = ["patch"] as const;
