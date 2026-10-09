import {
  experimental_composeSpec,
  type Experimental_CompositionEvaluator,
  type Experimental_CompositionEvent,
  type Spec,
} from "@json-render/core";
import { explorerCatalog } from "../render/catalog";
import { buildCandidates, MAX_ELEMENTS, platformState } from "./grammar";
import { createTypeSafeEvaluator } from "./typesafe-evaluator";

export type Evaluate = Experimental_CompositionEvaluator;
export type CompositionEvent =
  | Extract<Experimental_CompositionEvent, { type: "step" }>
  | Extract<Experimental_CompositionEvent, { type: "complete" }>
  | { type: "error"; message: string };

/** Chat supplies explorer recipes; Jev only answers Choice questions. */
export async function* composeUI(
  prompt: string,
  signal: AbortSignal,
  evaluate: Evaluate = createTypeSafeEvaluator(),
  initialSpec?: Spec,
): AsyncGenerator<CompositionEvent> {
  for await (const event of experimental_composeSpec({
    catalog: explorerCatalog,
    candidates: buildCandidates(prompt),
    initialSpec,
    initialState: { ...platformState, ...initialSpec?.state },
    elementDescriptions:
      initialSpec &&
      Object.fromEntries(
        Object.entries(initialSpec.elements).flatMap(([id, element]) => {
          const labels = ["title", "text", "label", "content", "name"].flatMap(
            (key) =>
              typeof element.props[key] === "string"
                ? [`${key}: ${JSON.stringify(element.props[key])}`]
                : [],
          );
          return labels.length
            ? [[id, [element.type, ...labels].join("; ")]]
            : [];
        }),
      ),
    prompt,
    signal,
    evaluate,
    maxSteps: MAX_ELEMENTS,
    maxElements: MAX_ELEMENTS,
    maxDepth: 4,
    context: {
      platform:
        "Available prepared sample data: a three-city weather comparison; vercel/next.js and vercel/ai GitHub stats; Bitcoin, Ethereum, and Solana prices with a five-day Bitcoin chart; three Hacker News stories. Quoted titles may be copied from the request. This is not a live tool fetch.",
    },
    instructions: {
      root: "Use Card for a compact dashboard panel. Use vertical Stack for a page with a heading then several sections. Use Grid as root only when the entire page is one uniform grid of peers.",
      next: "Include a Grid or horizontal Stack for a requested side-by-side group of metrics. Include only requested content. Prefer a compact tree.",
      parent:
        "Never put headings inside a horizontal metric row. Choose the root for a new top-level section.",
    },
  })) {
    yield event;
  }
}
