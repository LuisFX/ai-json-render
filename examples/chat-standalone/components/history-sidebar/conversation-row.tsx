"use client";

import { memo } from "react";

import {
  Archive,
  Download,
  EllipsisVertical,
  GitFork,
  MessageSquare,
  Pencil,
  Pin,
  PinOff,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import type { ConversationSummary } from "@/lib/conversation-summary";
import {
  formatArtifactChipLabel,
  formatBadgeLabel,
  formatMessageCount,
  formatPrimaryTitle,
  formatTimeAgo,
} from "@/lib/sidebar-enrichment";

export type ConversationRowProps = {
  row: ConversationSummary;
  isCurrent: boolean;
  showManagementMenu: boolean;
  /** CSI-005 — this thread has a live in-flight stream (it keeps running even when not open). */
  isStreaming?: boolean;
  onSelect: (id: string) => void;
  onArchive?: (id: string) => void;
  onRename?: (id: string) => void;
  onTogglePinned?: (id: string) => void;
  onExport?: (id: string) => void;
  onFork?: (id: string) => void;
};

// SRS — memoized so a re-render of the streaming ConversationView/HistorySidebar does NOT re-render every
// row (and its heavy Radix DropdownMenu subtree). All props from HistorySidebar are stable, so memo holds.
export const ConversationRow = memo(function ConversationRow({
  row,
  isCurrent,
  showManagementMenu,
  isStreaming = false,
  onSelect,
  onArchive,
  onRename,
  onTogglePinned,
  onExport,
  onFork,
}: ConversationRowProps) {
  const displayName = formatPrimaryTitle(row);
  const hasCustomName = row.name != null && row.name.trim().length > 0;
  const preview = row.preview.trim();
  const artifactLabel =
    row.artifact != null ? formatArtifactChipLabel(row.artifact) : null;
  const badgeLabel = formatBadgeLabel(row.badges);

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onSelect(row.id)}
        data-conversation-row={row.id}
        data-current={isCurrent ? "true" : "false"}
        data-conversation-custom-name={hasCustomName ? "true" : "false"}
        className={
          isCurrent
            ? "block w-full rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 pr-9 text-left shadow-sm"
            : "block w-full rounded-lg border border-transparent px-3 py-2.5 pr-9 text-left hover:border-border/60 hover:bg-muted/60"
        }
      >
        <div className="flex items-start gap-2">
          {isStreaming ? (
            // CSI-005 — a live thread shows the ONE processing language (real compositor spin), so its
            // current progress is visible in the list even when another conversation is open.
            <Spinner
              className="mt-0.5 size-3.5 shrink-0 text-primary"
              data-conversation-streaming={row.id}
            />
          ) : (
            <MessageSquare
              className={
                isCurrent
                  ? "mt-0.5 size-3.5 shrink-0 text-primary"
                  : "mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              }
              aria-hidden="true"
            />
          )}
          <div className="min-w-0 flex-1">
            <div
              className={
                isCurrent
                  ? "truncate text-sm font-medium text-foreground"
                  : "truncate text-sm text-foreground"
              }
            >
              {displayName}
            </div>
            {(artifactLabel != null || badgeLabel != null) && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {artifactLabel != null && (
                  <span
                    data-conversation-artifact-chip="true"
                    className="max-w-full truncate rounded border border-border/70 bg-muted/50 px-1 py-px text-[10px] text-muted-foreground"
                  >
                    {artifactLabel}
                  </span>
                )}
                {badgeLabel != null && (
                  <span
                    data-conversation-badge="true"
                    className="max-w-full truncate rounded border border-border/50 px-1 py-px text-[10px] text-muted-foreground/90"
                  >
                    {badgeLabel}
                  </span>
                )}
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{formatTimeAgo(row.updatedAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{formatMessageCount(row.messageCount)}</span>
            </div>
            {preview.length > 0 && (
              <p
                data-conversation-preview="true"
                className="mt-1 truncate text-[11px] text-muted-foreground/80"
              >
                {preview}
              </p>
            )}
            {hasCustomName && (
              <div className="mt-1 truncate text-[10px] text-muted-foreground/70">
                {row.title}
              </div>
            )}
          </div>
        </div>
      </button>
      {showManagementMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-conversation-menu-trigger={row.id}
              aria-label={`Open conversation actions: ${displayName}`}
              title="Conversation actions"
              className="absolute right-1 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus:opacity-100 focus:outline-none group-hover:opacity-100 data-[state=open]:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <EllipsisVertical className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {onTogglePinned && (
              <DropdownMenuItem
                data-conversation-pin={row.id}
                onClick={() => onTogglePinned(row.id)}
              >
                {row.pinnedAt == null ? (
                  <Pin className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <PinOff className="h-4 w-4" aria-hidden="true" />
                )}
                {row.pinnedAt == null ? "Pin" : "Unpin"}
              </DropdownMenuItem>
            )}
            {onRename && (
              <DropdownMenuItem
                data-conversation-rename={row.id}
                onClick={() => onRename(row.id)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Rename
              </DropdownMenuItem>
            )}
            {onExport && (
              <DropdownMenuItem
                data-conversation-export={row.id}
                onClick={() => onExport(row.id)}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Export
              </DropdownMenuItem>
            )}
            {onFork && (
              <DropdownMenuItem
                data-conversation-fork={row.id}
                onClick={() => onFork(row.id)}
              >
                <GitFork className="h-4 w-4" aria-hidden="true" />
                Fork
              </DropdownMenuItem>
            )}
            {onArchive && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-conversation-archive={row.id}
                  variant="destructive"
                  onClick={() => onArchive(row.id)}
                >
                  <Archive className="h-4 w-4" aria-hidden="true" />
                  Archive
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});
