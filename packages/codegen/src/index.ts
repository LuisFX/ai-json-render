export {
  traverseTree,
  collectUsedComponents,
  collectDataPaths,
  collectActions,
  type TreeVisitor,
} from "./traverse";

export {
  serializePropValue,
  serializeProps,
  escapeString,
  type SerializeOptions,
} from "./serialize";

export type { GeneratedFile, CodeGenerator } from "./types";
