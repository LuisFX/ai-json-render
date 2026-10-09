import type { Experimental_CompositionEvaluator } from "@json-render/core";
import { TypeSafeClient, type EntryType } from "@typesafe-ai/sdk";
import { typeSafeApiKey } from "../model";

/**
 * Chat Jev evaluator: TypeSafe System One over the native API.
 * json-render's composer still owns tree assembly; this only answers Choice questions.
 */
export function createTypeSafeEvaluator(
  apiKey = typeSafeApiKey(),
): Experimental_CompositionEvaluator {
  if (!apiKey) throw new Error("TYPESAFE_API_KEY is required.");
  const client = new TypeSafeClient({
    apiKey,
    defaultModel: "jev-latest",
  });
  return async ({ state, questions, signal }) => {
    const result = await client.systemOne(
      { state: state as EntryType, questions },
      { signal },
    );
    const answers = Object.fromEntries(
      Object.entries(questions).map(([name, question]) => {
        const answer = result.answers[name];
        if (!answer || answer.type !== "choice")
          throw new Error(`TypeSafe returned no choice for ${name}.`);
        if (!Object.hasOwn(question.criteria, answer.choice))
          throw new Error(
            "Evaluator returned a choice outside the offered criteria.",
          );
        return [name, { choice: answer.choice, confidence: answer.confidence }];
      }),
    );
    return {
      answers,
      usage: { inputTokens: result.usage.input_tokens },
    };
  };
}
