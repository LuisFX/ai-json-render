import { z } from "zod";
import {
  applySpecPatch,
  diffToPatches,
  SPEC_DATA_PART,
  SPEC_DATA_PART_TYPE,
  type Spec,
  type SpecDataPart,
} from "@json-render/core";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { composeUI } from "./compose";
import { typeSafeApiKey } from "../model";

type AppMessage = UIMessage<unknown, { [SPEC_DATA_PART]: SpecDataPart }>;

const inputSchema = z.object({ prompt: z.string().trim().min(1).max(1000) });
const previousSpecSchema = z
  .object({
    root: z.string().min(1),
    elements: z
      .record(
        z.string(),
        z
          .object({
            type: z.string(),
            props: z.record(z.string(), z.unknown()),
          })
          .passthrough(),
      )
      .refine((elements) => Object.keys(elements).length <= 100),
    state: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export function lastUserPrompt(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]!;
    if (message.role !== "user") continue;
    return message.parts
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join("\n")
      .trim();
  }
  return "";
}

/** Replay the last assistant spec so Jev can edit it. Patches accumulate; a flat spec replaces. */
export function lastAssistantSpec(messages: UIMessage[]): Spec | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]!;
    if (message.role !== "assistant") continue;
    let spec: Spec = { root: "", elements: {} };
    let saw = false;
    for (const part of message.parts) {
      if (part.type !== SPEC_DATA_PART_TYPE) continue;
      const data = (part as { data: SpecDataPart }).data;
      if (data.type === "flat") {
        spec = structuredClone(data.spec);
        saw = true;
      } else if (data.type === "patch") {
        applySpecPatch(spec, data.patch);
        saw = true;
      }
    }
    if (saw && spec.root) return spec;
  }
  return undefined;
}

export function createCompositionStreamResponse(
  request: Request,
  prompt: unknown,
  previousSpec?: unknown,
) {
  const input = inputSchema.safeParse({ prompt });
  if (!input.success)
    return Response.json(
      { error: "Enter a request between 1 and 1,000 characters." },
      { status: 400 },
    );
  const previous =
    previousSpec == null
      ? undefined
      : previousSpecSchema.safeParse(previousSpec);
  if (previous && !previous.success)
    return Response.json(
      {
        error:
          "The selected version must be a valid spec with at most 100 elements.",
      },
      { status: 400 },
    );
  const initialSpec = previous?.success ? (previous.data as Spec) : undefined;
  if (!typeSafeApiKey())
    return Response.json(
      {
        error:
          "Jev is temporarily unavailable. Set TYPESAFE_API_KEY to continue.",
      },
      { status: 503 },
    );

  const controller = new AbortController();
  const signal = AbortSignal.any([
    request.signal,
    controller.signal,
    AbortSignal.timeout(55000),
  ]);

  const stream = createUIMessageStream<AppMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: "jev" });
      writer.write({
        type: "text-delta",
        id: "jev",
        delta: "Composing from prepared sample data — not a live tool fetch.",
      });
      writer.write({ type: "text-end", id: "jev" });

      let lastSpec: Spec = initialSpec ?? { root: "", elements: {} };
      const sendSpec = (spec: Spec) => {
        for (const patch of diffToPatches(
          lastSpec as unknown as Record<string, unknown>,
          spec as unknown as Record<string, unknown>,
        )) {
          writer.write({
            type: SPEC_DATA_PART_TYPE,
            data: { type: "patch", patch },
          });
        }
        lastSpec = spec;
      };

      try {
        let finalSpec: Spec | null = null;
        for await (const event of composeUI(
          input.data.prompt,
          signal,
          undefined,
          initialSpec,
        )) {
          if (event.type === "error") throw new Error(event.message);
          if (event.type === "step") {
            sendSpec(event.spec);
            finalSpec = event.spec;
          } else if (event.spec) {
            sendSpec(event.spec);
            finalSpec = event.spec;
          }
        }
        if (finalSpec) {
          writer.write({
            type: SPEC_DATA_PART_TYPE,
            data: { type: "flat", spec: finalSpec },
          });
        }
      } catch (error) {
        if (!controller.signal.aborted && !request.signal.aborted) {
          writer.write({
            type: "error",
            errorText:
              error instanceof z.ZodError
                ? "Jev returned an invalid decision payload."
                : error instanceof Error
                  ? error.message
                  : "Composition failed.",
          });
        }
      } finally {
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish" });
      }
    },
  });

  request.signal.addEventListener("abort", () => controller.abort(), {
    once: true,
  });

  return createUIMessageStreamResponse({ stream });
}
