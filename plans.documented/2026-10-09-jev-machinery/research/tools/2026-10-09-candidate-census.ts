/**
 * Candidate census for the two Jev hosts.
 *
 * One command, from the repo root, under Node 24:
 *
 *   bun plans.documented/2026-10-09-jev-machinery/research/tools/2026-10-09-candidate-census.ts
 *
 * Prints how many atomic recipes each host offers Jev for a named prompt.
 * The composer never lets Jev invent a candidate; this count is the ceiling.
 */
import { buildCandidates as playgroundCandidates } from "../../../../apps/web/lib/jev/grammar.ts";
import { buildCandidates as chatCandidates } from "../../../../examples/chat/lib/jev/grammar.ts";

const prompts = [
  "Design a user profile card",
  'Change the heading to "Account settings"',
  "Show me the weather in Austin",
  "Show Bitcoin, Ethereum, and Solana prices",
];

function census(
  label: string,
  build: (
    prompt: string,
  ) => { id: string; element: { type: string }; resource?: string }[],
) {
  console.log(`\n== ${label} ==`);
  for (const prompt of prompts) {
    const candidates = build(prompt);
    const types = [...new Set(candidates.map((c) => c.element.type))].sort();
    const resources = [
      ...new Set(
        candidates
          .map((c) => c.resource)
          .filter((r): r is string => typeof r === "string"),
      ),
    ].sort();
    console.log(
      JSON.stringify({
        prompt,
        count: candidates.length,
        types: types.length,
        typeList: types,
        resources: resources.length,
        ids: candidates.map((c) => c.id),
      }),
    );
  }
}

census("playground apps/web/lib/jev/grammar.ts", playgroundCandidates);
census("chat examples/chat/lib/jev/grammar.ts", chatCandidates);
