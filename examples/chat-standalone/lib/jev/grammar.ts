import type {
  Experimental_CompositionCandidate,
  UIElement,
} from "@json-render/core";

export const MAX_ELEMENTS = 14;
export type Candidate = Experimental_CompositionCandidate;

/** Synthetic explorer data. Jev cannot fetch live tools; it only selects these recipes. */
export const platformState = {
  weather: [
    { city: "New York", temp: "72°F", condition: "Clear", humidity: "48%" },
    { city: "London", temp: "59°F", condition: "Overcast", humidity: "71%" },
    { city: "Tokyo", temp: "81°F", condition: "Humid", humidity: "64%" },
  ],
  repos: [
    { name: "vercel/next.js", stars: "133k", language: "TypeScript" },
    { name: "vercel/ai", stars: "17k", language: "TypeScript" },
  ],
  crypto: [
    { asset: "Bitcoin", price: "$67,420", change: "+2.1%" },
    { asset: "Ethereum", price: "$3,280", change: "+1.4%" },
    { asset: "Solana", price: "$178", change: "-0.6%" },
  ],
  btcHistory: [
    { day: "Mon", price: 64200 },
    { day: "Tue", price: 65110 },
    { day: "Wed", price: 64840 },
    { day: "Thu", price: 66120 },
    { day: "Fri", price: 67420 },
  ],
  hn: [
    { title: "Show HN: a tiny search engine", score: 412, comments: 88 },
    { title: "The cost of an extra index", score: 287, comments: 54 },
    { title: "Ask HN: what are you shipping?", score: 196, comments: 143 },
  ],
};

export function buildCandidates(prompt: string): Candidate[] {
  const candidates: Candidate[] = [];
  function add(
    id: string,
    description: string,
    type: string,
    props: Record<string, unknown>,
    resource?: string,
    on?: UIElement["on"],
  ) {
    candidates.push({
      id,
      description,
      resource,
      root: ["card", "stack_vertical", "grid_two", "grid_three"].includes(id),
      maxUses: ["Card", "Stack", "Grid", "Separator"].includes(type)
        ? MAX_ELEMENTS
        : 1,
      element: { type, props, ...(on ? { on } : {}) },
    });
  }

  add(
    "card",
    "Card: a bordered container for a compact dashboard panel.",
    "Card",
    {
      title: null,
      description: null,
      maxWidth: "lg",
      centered: true,
      className: null,
    },
  );
  add(
    "stack_vertical",
    "Stack: vertical layout for a page with a heading then several sections.",
    "Stack",
    {
      direction: "vertical",
      gap: "md",
      align: "stretch",
      justify: "start",
      className: null,
    },
  );
  add(
    "stack_horizontal",
    "Stack: horizontal row for side-by-side metrics or actions.",
    "Stack",
    {
      direction: "horizontal",
      gap: "sm",
      align: "center",
      justify: "start",
      className: null,
    },
  );
  add("grid_two", "Grid: two equal columns for side-by-side cards.", "Grid", {
    columns: 2,
    gap: "md",
    className: null,
  });
  add(
    "grid_three",
    "Grid: three equal columns, e.g. a row of city or asset metrics.",
    "Grid",
    { columns: 3, gap: "md", className: null },
  );

  const titles = [
    "Weather comparison",
    "GitHub stats",
    "Crypto dashboard",
    "Hacker News",
    "Explorer",
  ];
  const quoted = [...prompt.matchAll(/["“]([^"”\n]{1,80})["”]/g)].map(
    (match) => match[1]!,
  );
  for (const [index, text] of [...new Set([...titles, ...quoted])]
    .slice(0, 12)
    .entries()) {
    add(
      `heading_${index}`,
      `Heading with the exact text ${JSON.stringify(text)}. Include only when this is the requested title.`,
      "Heading",
      { text, level: "h2" },
      `text:${text}`,
    );
  }

  add(
    "intro",
    "Text: short note that this dashboard uses prepared sample data, not a live tool fetch.",
    "Text",
    {
      content: "Prepared sample data for Jev composition — not a live fetch.",
      muted: true,
    },
    "data:intro",
  );
  add(
    "callout_sample",
    "Callout: explains that Jev selected among prepared explorer recipes.",
    "Callout",
    {
      type: "info",
      title: "Sample data",
      content:
        "Turn Jev off to fetch live weather, GitHub, crypto, or Hacker News.",
    },
    "data:callout",
  );

  add(
    "metric_nyc",
    "Metric: New York temperature 72°F, clear. Synthetic weather.",
    "Metric",
    {
      label: "New York",
      value: "72°F",
      detail: "Clear · humidity 48%",
      trend: "up",
    },
    "data:weather_nyc",
  );
  add(
    "metric_london",
    "Metric: London temperature 59°F, overcast. Synthetic weather.",
    "Metric",
    {
      label: "London",
      value: "59°F",
      detail: "Overcast · humidity 71%",
      trend: "neutral",
    },
    "data:weather_london",
  );
  add(
    "metric_tokyo",
    "Metric: Tokyo temperature 81°F, humid. Synthetic weather.",
    "Metric",
    {
      label: "Tokyo",
      value: "81°F",
      detail: "Humid · humidity 64%",
      trend: "up",
    },
    "data:weather_tokyo",
  );
  add(
    "weather_table",
    "Table: weather comparison for New York, London, and Tokyo bound to /weather.",
    "Table",
    {
      data: { $state: "/weather" },
      columns: [
        { key: "city", label: "City" },
        { key: "temp", label: "Temp" },
        { key: "condition", label: "Condition" },
        { key: "humidity", label: "Humidity" },
      ],
      emptyMessage: null,
    },
    "data:weather_table",
  );

  add(
    "metric_next",
    "Metric: vercel/next.js star count. Synthetic GitHub stats.",
    "Metric",
    {
      label: "vercel/next.js",
      value: "133k",
      detail: "TypeScript",
      trend: "up",
    },
    "data:repo_next",
  );
  add(
    "metric_ai",
    "Metric: vercel/ai star count. Synthetic GitHub stats.",
    "Metric",
    {
      label: "vercel/ai",
      value: "17k",
      detail: "TypeScript",
      trend: "up",
    },
    "data:repo_ai",
  );
  add(
    "repos_table",
    "Table: GitHub repo stats bound to /repos.",
    "Table",
    {
      data: { $state: "/repos" },
      columns: [
        { key: "name", label: "Repo" },
        { key: "stars", label: "Stars" },
        { key: "language", label: "Language" },
      ],
      emptyMessage: null,
    },
    "data:repos_table",
  );
  add(
    "link_next",
    "Link: open vercel/next.js on GitHub.",
    "Link",
    { text: "vercel/next.js", href: "https://github.com/vercel/next.js" },
    "data:link_next",
  );

  add(
    "metric_btc",
    "Metric: Bitcoin price $67,420, up 2.1%. Synthetic crypto.",
    "Metric",
    {
      label: "Bitcoin",
      value: "$67,420",
      detail: "+2.1% today",
      trend: "up",
    },
    "data:btc",
  );
  add(
    "metric_eth",
    "Metric: Ethereum price $3,280, up 1.4%. Synthetic crypto.",
    "Metric",
    {
      label: "Ethereum",
      value: "$3,280",
      detail: "+1.4% today",
      trend: "up",
    },
    "data:eth",
  );
  add(
    "metric_sol",
    "Metric: Solana price $178, down 0.6%. Synthetic crypto.",
    "Metric",
    {
      label: "Solana",
      value: "$178",
      detail: "-0.6% today",
      trend: "down",
    },
    "data:sol",
  );
  add(
    "btc_chart",
    "BarChart: five-day Bitcoin price history bound to /btcHistory.",
    "BarChart",
    {
      title: "Bitcoin this week",
      data: { $state: "/btcHistory" },
      xKey: "day",
      yKey: "price",
      aggregate: null,
      color: null,
      height: 220,
    },
    "data:btc_chart",
  );
  add(
    "crypto_table",
    "Table: Bitcoin, Ethereum, and Solana prices bound to /crypto.",
    "Table",
    {
      data: { $state: "/crypto" },
      columns: [
        { key: "asset", label: "Asset" },
        { key: "price", label: "Price" },
        { key: "change", label: "Change" },
      ],
      emptyMessage: null,
    },
    "data:crypto_table",
  );

  add(
    "hn_table",
    "Table: top Hacker News stories bound to /hn.",
    "Table",
    {
      data: { $state: "/hn" },
      columns: [
        { key: "title", label: "Title" },
        { key: "score", label: "Score" },
        { key: "comments", label: "Comments" },
      ],
      emptyMessage: null,
    },
    "data:hn_table",
  );
  add(
    "badge_hn",
    "Badge: live-looking HN label. Sample only.",
    "Badge",
    { text: "Top stories", variant: "secondary" },
    "data:badge_hn",
  );

  add(
    "separator",
    "Separator: horizontal dividing line, only when requested.",
    "Separator",
    { orientation: "horizontal" },
  );
  return candidates;
}
