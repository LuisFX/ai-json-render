import type {
  ConversationArtifactRef,
  ConversationSummary,
} from "./conversation-summary";

/** Relative time from an ISO timestamp — "Just now", "5m", "3h", "2d", "1w". */
export function formatTimeAgo(iso: string, nowMs?: number): string {
  const updatedAtMs = Date.parse(iso);
  const now = nowMs ?? Date.now();
  const diff = Math.max(0, now - updatedAtMs);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

export type RecencyBucket = "today" | "last7Days" | "older";

export type RecencyBuckets = Record<RecencyBucket, ConversationSummary[]>;

function startOfUtcDayMs(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function sortNewestFirst(rows: ConversationSummary[]): ConversationSummary[] {
  return [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Bucket unpinned conversations into Today / Last 7 days / Older. */
export function bucketByRecency(
  rows: ReadonlyArray<ConversationSummary>,
  nowMs?: number,
): RecencyBuckets {
  const now = nowMs ?? Date.now();
  const startOfToday = startOfUtcDayMs(now);
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const buckets: RecencyBuckets = {
    today: [],
    last7Days: [],
    older: [],
  };

  for (const row of rows) {
    if (row.pinnedAt != null) continue;
    const updatedAtMs = Date.parse(row.updatedAt);
    if (updatedAtMs >= startOfToday) buckets.today.push(row);
    else if (updatedAtMs >= sevenDaysAgo) buckets.last7Days.push(row);
    else buckets.older.push(row);
  }

  buckets.today = sortNewestFirst(buckets.today);
  buckets.last7Days = sortNewestFirst(buckets.last7Days);
  buckets.older = sortNewestFirst(buckets.older);
  return buckets;
}

function formatShortUtcDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Primary display title: custom name → auto title → date fallback. */
export function formatPrimaryTitle(summary: ConversationSummary): string {
  if (summary.name != null && summary.name.trim().length > 0) {
    return summary.name.trim();
  }
  if (summary.title.trim().length > 0 && summary.title !== "New conversation") {
    return summary.title;
  }
  if (summary.preview.trim().length > 0) {
    const preview = summary.preview.trim();
    if (preview.length <= 48) return preview;
    return `${preview.slice(0, 48)}…`;
  }
  return `Conversation · ${formatShortUtcDate(summary.createdAt)}`;
}

function artifactSearchText(
  artifact: ConversationArtifactRef | null | undefined,
): string {
  if (artifact == null) return "";
  return [artifact.title, artifact.slug, artifact.id, artifact.kind]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ");
}

/** Case-insensitive search across name, title, preview, and artifact fields. */
export function searchConversations(
  summaries: ReadonlyArray<ConversationSummary>,
  query: string,
): ConversationSummary[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [...summaries];
  return summaries.filter((s) => {
    const haystack = [
      s.name,
      s.title,
      s.preview,
      artifactSearchText(s.artifact),
    ]
      .filter((v): v is string => v != null && v.length > 0)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function formatMessageCount(count: number): string {
  return `${count} ${count === 1 ? "msg" : "msgs"}`;
}

export const RECENCY_SECTION_LABELS: Record<RecencyBucket, string> = {
  today: "Today",
  last7Days: "Last 7 days",
  older: "Older",
};

/** Filter chip: all conversations, free chat (no artifact), or a specific artifact id. */
export type ArtifactFilterChip = "all" | "free-chat" | string;

export function formatArtifactFilterChipLabel(
  chip: ArtifactFilterChip,
  summaries?: ReadonlyArray<ConversationSummary>,
): string {
  if (chip === "all") return "All";
  if (chip === "free-chat") return "Free chat";
  const match = summaries?.find((s) => s.artifact?.id === chip)?.artifact;
  return match?.slug ?? match?.title ?? chip;
}

/** Distinct artifact filter chips derived from the list (excluding `all`). Sorted ids + free-chat when present. */
export function distinctArtifactFilterChips(
  summaries: ReadonlyArray<ConversationSummary>,
): ArtifactFilterChip[] {
  const byId = new Map<string, ConversationArtifactRef>();
  let hasFreeChat = false;
  for (const s of summaries) {
    if (s.artifact == null) {
      hasFreeChat = true;
      continue;
    }
    byId.set(s.artifact.id, s.artifact);
  }
  const chips: ArtifactFilterChip[] = [...byId.keys()].sort((a, b) =>
    a.localeCompare(b),
  );
  if (hasFreeChat) chips.push("free-chat");
  return chips;
}

export function applyArtifactFilter(
  summaries: ReadonlyArray<ConversationSummary>,
  chip: ArtifactFilterChip,
): ConversationSummary[] {
  if (chip === "all") return [...summaries];
  if (chip === "free-chat") return summaries.filter((s) => s.artifact == null);
  return summaries.filter((s) => s.artifact?.id === chip);
}

/** Short label for a row artifact chip. */
export function formatArtifactChipLabel(
  artifact: ConversationArtifactRef,
): string {
  return artifact.slug ?? artifact.title ?? artifact.id;
}

/** First badge label when badges are present. */
export function formatBadgeLabel(
  badges: ConversationSummary["badges"],
): string | null {
  if (badges == null || badges.length === 0) return null;
  const first = badges[0];
  if (first == null) return null;
  if (badges.length === 1) return first.label;
  return `${first.label} +${badges.length - 1}`;
}
