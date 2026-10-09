// @vitest-environment node
import { describe, expect, it } from "vitest";
import { composeUI, type CompositionEvent, type Evaluate } from "./compose";
import { buildCandidates } from "./grammar";

function scripted(
  choices: { next: string; parent?: string }[],
  usage: number | undefined = 100,
): Evaluate {
  let index = 0;
  return async ({ questions, state }) => {
    if (
      questions.root ||
      Object.keys(questions).some((name) => name.startsWith("order_"))
    ) {
      const candidates = buildCandidates(String(state.user_request));
      const selected = state.selected_elements as
        | { id: string; content: string }[]
        | undefined;
      const idFor = (candidateId: string) =>
        selected?.find(
          (element) =>
            element.content ===
            candidates.find((c) => c.id === candidateId)?.description,
        )?.id;
      const answers = Object.fromEntries(
        Object.entries(questions).map(([name, question]) => {
          let choice: string;
          if (name === "root") choice = choices[0]!.next;
          else if (name.startsWith("select_")) {
            if (Object.hasOwn(question.criteria, "0")) {
              const candidate = candidates.find((c) =>
                question.instructions.includes(c.description),
              )!;
              choice = String(
                choices.filter((c) => c.next === candidate.id).length,
              );
            } else {
              choice =
                choices
                  .map((c) => `use:${c.next}`)
                  .find((key) => Object.hasOwn(question.criteria, key)) ??
                "omit";
            }
          } else {
            const id = name.replace(/^(parent|order)_/, "");
            const element = selected!.find((e) => e.id === id)!;
            const candidate = candidates.find(
              (c) => c.description === element.content,
            )!;
            const at = choices.findIndex((c) => c.next === candidate.id);
            const fixture = choices[at]!;
            if (name.startsWith("order_")) choice = String(at);
            else if (fixture.parent?.startsWith("node_")) {
              const originalParent =
                choices[Number(fixture.parent.slice(5))]!.next;
              choice = `${idFor(originalParent)}:default`;
            } else choice = fixture.parent ?? "node_0:default";
          }
          return [name, { choice, confidence: 0.9 }];
        }),
      );
      return { answers, usage: { inputTokens: usage } };
    }
    const selected = choices[index++];
    if (!selected) throw new Error("Unexpected extra model call");
    const answers = Object.fromEntries(
      Object.keys(questions).map((name) => [
        name,
        {
          confidence: 0.9,
          choice: selected[name as keyof typeof selected]!,
        },
      ]),
    );
    return {
      answers,
      usage: { inputTokens: usage },
    };
  };
}

describe("chat Jev catalog composition", () => {
  it("composes a weather comparison using the explorer catalog schemas", async () => {
    const events: CompositionEvent[] = [];
    for await (const event of composeUI(
      "Compare the weather in New York, London, and Tokyo",
      new AbortController().signal,
      scripted([
        { next: "card" },
        { next: "heading_0" },
        { next: "grid_three" },
        { next: "metric_nyc" },
        { next: "metric_london" },
        { next: "metric_tokyo" },
        { next: "weather_table" },
        { next: "finish" },
      ]),
    ))
      events.push(event);
    const last = events.at(-1)!;
    if (last.type !== "complete") throw new Error("Missing weather spec");
    expect(last.stopReason).toBe("finish");
    const elements = Object.values(last.spec!.elements);
    expect(elements.map((element) => element.type).sort()).toEqual(
      ["Card", "Grid", "Heading", "Metric", "Metric", "Metric", "Table"].sort(),
    );
    expect(
      elements.find((element) => element.type === "Heading")?.props.text,
    ).toBe("Weather comparison");
    expect(
      elements.find((element) => element.props.value === "72°F")?.type,
    ).toBe("Metric");
    const table = elements.find((element) => element.type === "Table")!;
    expect(table.props.data).toEqual({ $state: "/weather" });
    expect(table.props.columns).toEqual([
      { key: "city", label: "City" },
      { key: "temp", label: "Temp" },
      { key: "condition", label: "Condition" },
      { key: "humidity", label: "Humidity" },
    ]);
    expect(last.spec!.state?.weather).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ city: "New York", temp: "72°F" }),
      ]),
    );
  });

  it("copies quoted titles into Heading candidates and uses Text.content", () => {
    const text = "<script>alert(1)</script>";
    const candidates = buildCandidates(`Title the UI "${text}".`);
    expect(
      candidates.find((c) => c.element.props.text === text)?.element.type,
    ).toBe("Heading");
    expect(
      candidates.find((c) => c.id === "intro")?.element.props.content,
    ).toEqual("Prepared sample data for Jev composition — not a live fetch.");
  });

  it("cannot accept an arbitrary component from the model", async () => {
    await expect(
      (async () => {
        const events: CompositionEvent[] = [];
        for await (const event of composeUI(
          "Compare the weather in New York, London, and Tokyo",
          new AbortController().signal,
          scripted([{ next: "execute_shell" }]),
        ))
          events.push(event);
        return events;
      })(),
    ).rejects.toThrow("outside the permitted");
  });

  it("reports unavailable capability without producing a misleading empty UI", async () => {
    const events: CompositionEvent[] = [];
    for await (const event of composeUI(
      "Compare the weather in New York, London, and Tokyo",
      new AbortController().signal,
      scripted([{ next: "unavailable" }]),
    ))
      events.push(event);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "complete",
      spec: null,
      stopReason: "unavailable",
    });
  });
});
