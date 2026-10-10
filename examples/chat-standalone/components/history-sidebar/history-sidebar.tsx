"use client";

import { memo, useMemo, useState } from "react";

import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { ConversationRow } from "./conversation-row";
import type { ConversationSummary } from "@/lib/conversation-summary";
import {
  RECENCY_SECTION_LABELS,
  type ArtifactFilterChip,
  applyArtifactFilter,
  bucketByRecency,
  distinctArtifactFilterChips,
  formatArtifactFilterChipLabel,
  searchConversations,
} from "@/lib/sidebar-enrichment";

// =============================================================================
// HistorySidebar — Meridian-grade conversation list (presentational).
// The page owns fetching, selection, mutations, and URL sync.
// =============================================================================

export type HistorySidebarProps = {
  chats: ConversationSummary[];
  activeId: string | null;
  /** CSI-005 — conversation ids with a live in-flight stream (each keeps streaming when not open). */
  streamingIds?: Set<string>;
  collapsed: boolean;
  query: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onToggleCollapsed: () => void;
  onQueryChange: (query: string) => void;
  onArchive?: (id: string) => void;
  onRename?: (id: string) => void;
  onTogglePinned?: (id: string) => void;
  onExport?: (id: string) => void;
  onFork?: (id: string) => void;
  /** Empty-list copy (clinical patient-scoped vs marketplace default). */
  emptyCopy?: string;
};

function newestFirst(summaries: ConversationSummary[]): ConversationSummary[] {
  return [...summaries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function pinnedFirst(summaries: ConversationSummary[]): ConversationSummary[] {
  return [...summaries].sort((a, b) => {
    const aPin = a.pinnedAt ?? "";
    const bPin = b.pinnedAt ?? "";
    return bPin.localeCompare(aPin);
  });
}

const DEFAULT_EMPTY_COPY = "No conversations yet. Start typing below to begin.";

// SRS — memoized so it bails out when ConversationView re-renders on a streamed token (its props are all
// stable refs). This stops the ~2M-render storm: the sidebar + ~44 rows + their Radix dropdowns no longer
// re-render per chunk. The sidebar only re-renders when its OWN inputs (chats list, activeId, query…) change.
export const HistorySidebar = memo(function HistorySidebar({
  chats,
  activeId,
  streamingIds,
  collapsed,
  query,
  onSelect,
  onNew,
  onToggleCollapsed,
  onQueryChange,
  onArchive,
  onRename,
  onTogglePinned,
  onExport,
  onFork,
  emptyCopy = DEFAULT_EMPTY_COPY,
}: HistorySidebarProps) {
  const [artifactFilter, setArtifactFilter] =
    useState<ArtifactFilterChip>("all");

  const artifactChips = useMemo(
    () => distinctArtifactFilterChips(chats),
    [chats],
  );
  const showArtifactFilter = !collapsed && artifactChips.length >= 2;

  const filteredByArtifact = useMemo(
    () => applyArtifactFilter(chats, artifactFilter),
    [chats, artifactFilter],
  );
  const filtered = searchConversations(filteredByArtifact, query);
  const rows = newestFirst(filtered);
  const pinnedRows = pinnedFirst(rows.filter((row) => row.pinnedAt != null));
  const unpinnedRows = rows.filter((row) => row.pinnedAt == null);
  const buckets = bucketByRecency(unpinnedRows);
  const showManagementMenu =
    !collapsed &&
    (onArchive !== undefined ||
      onRename !== undefined ||
      onTogglePinned !== undefined ||
      onExport !== undefined ||
      onFork !== undefined);

  const renderRow = (row: ConversationSummary) => (
    <ConversationRow
      key={row.id}
      row={row}
      isCurrent={row.id === activeId}
      isStreaming={streamingIds?.has(row.id) ?? false}
      showManagementMenu={showManagementMenu}
      onSelect={onSelect}
      onArchive={onArchive}
      onRename={onRename}
      onTogglePinned={onTogglePinned}
      onExport={onExport}
      onFork={onFork}
    />
  );

  const filterChipIds: ArtifactFilterChip[] = ["all", ...artifactChips];

  return (
    <aside
      data-conversation-history-sidebar="true"
      data-collapsed={collapsed ? "true" : "false"}
      className={
        collapsed
          ? "flex h-full min-h-0 w-12 shrink-0 flex-col overflow-hidden border-r border-border/60 bg-muted/30 p-2"
          : "flex h-full min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r border-border/60 bg-muted/30 p-3"
      }
      aria-label="Conversation history"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {!collapsed && (
          <h2 className="text-sm font-medium text-foreground">Conversations</h2>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            data-conversation-sidebar-toggle="true"
            onClick={onToggleCollapsed}
            aria-label={
              collapsed
                ? "Expand conversation sidebar"
                : "Collapse conversation sidebar"
            }
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {!collapsed && (
        <button
          type="button"
          data-conversation-new="true"
          onClick={onNew}
          className="mb-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border/60 bg-background px-2 text-[12px] font-medium text-foreground hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New conversation</span>
        </button>
      )}

      {collapsed && (
        <button
          type="button"
          data-conversation-new="true"
          onClick={onNew}
          aria-label="Start a new conversation"
          className="mb-2 inline-flex h-8 w-8 items-center justify-center self-center rounded-md border border-border/60 bg-background text-foreground hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}

      {!collapsed && chats.length > 0 && (
        <div className="relative mb-2">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            data-conversation-search="true"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search conversations…"
            aria-label="Search conversations"
            className="h-8 w-full rounded-md border border-border/60 bg-background pl-7 pr-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {showArtifactFilter && (
        <div
          data-conversation-artifact-filter="true"
          className="mb-2 flex flex-wrap gap-1"
          role="group"
          aria-label="Filter by protocol"
        >
          {filterChipIds.map((chip) => {
            const selected = artifactFilter === chip;
            return (
              <button
                key={chip}
                type="button"
                data-artifact-filter-chip={chip}
                data-selected={selected ? "true" : "false"}
                onClick={() => setArtifactFilter(chip)}
                className={
                  selected
                    ? "rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                    : "rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                }
              >
                {formatArtifactFilterChipLabel(chip, chats)}
              </button>
            );
          })}
        </div>
      )}

      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {chats.length === 0 ? (
            <p className="px-1 py-2 text-[12px] leading-relaxed text-muted-foreground">
              {emptyCopy}
            </p>
          ) : rows.length === 0 ? (
            <p
              data-conversation-empty-after-search="true"
              className="px-1 py-2 text-[12px] leading-relaxed text-muted-foreground"
            >
              No conversations match your search.
            </p>
          ) : (
            <>
              {pinnedRows.length > 0 && (
                <section data-conversation-section="pinned">
                  <h3 className="px-1 py-1 text-[11px] font-medium text-muted-foreground">
                    Pinned
                  </h3>
                  <div className="flex flex-col gap-1">
                    {pinnedRows.map(renderRow)}
                  </div>
                </section>
              )}
              {(["today", "last7Days", "older"] as const).map((bucketKey) => {
                const sectionRows = buckets[bucketKey];
                if (sectionRows.length === 0) return null;
                return (
                  <section
                    key={bucketKey}
                    data-conversation-section={bucketKey}
                  >
                    <h3 className="px-1 py-1 text-[11px] font-medium text-muted-foreground">
                      {RECENCY_SECTION_LABELS[bucketKey]}
                    </h3>
                    <div className="flex flex-col gap-1">
                      {sectionRows.map(renderRow)}
                    </div>
                  </section>
                );
              })}
            </>
          )}
        </div>
      )}
    </aside>
  );
});
