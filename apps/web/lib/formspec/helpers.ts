import { createRequire } from "node:module";
import type * as FormSpecHelpers from "@f1studio/form-spec/Interop/FormSpec.Api.Helpers";

const require = createRequire(import.meta.url);

/**
 * Published helpers are CJS getters. Node's ESM named-export check does not
 * see them, so load the module with require and keep the .d.ts types.
 */
export const formSpecHelpers: typeof FormSpecHelpers = require("@f1studio/form-spec/Interop/FormSpec.Api.Helpers");
