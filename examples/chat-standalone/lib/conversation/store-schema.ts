import { z } from "zod";
import type { UIMessage } from "ai";

import type { ConversationArtifactRef } from "@/lib/conversation-summary";

/**
 * Thin port of Meridian marketplace `lib/conversation/store-schema.ts` for fixture/diff alignment.
 * Not a dependency on @meridian/* — same envelope keys so dumps compare without split-brain.
 * `messages` stay opaque (`z.unknown()` / UIMessage) — we do not pull Meridian AppMessage.
 */

const ConversationArtifactRefSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string().optional(),
  slug: z.string().optional(),
});

/** Shared conversation envelope schema (JSONL store + fixture dumps). */
export const ConversationEnvelopeSchema = z.object({
  id: z.string(),
  title: z.string(),
  name: z.string().nullable().optional(),
  forkedFrom: z.string().nullable().optional(),
  ownerSlug: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pinnedAt: z.string().nullable().optional(),
  archivedAt: z.string().nullable().optional(),
  messageCount: z.number(),
  preview: z.string(),
  artifact: ConversationArtifactRefSchema.nullable().optional(),
  messages: z.array(z.unknown()),
});

export type ConversationEnvelope = {
  id: string;
  title: string;
  name: string | null;
  forkedFrom: string | null;
  ownerSlug: string | null;
  createdAt: string;
  updatedAt: string;
  pinnedAt: string | null;
  archivedAt: string | null;
  messageCount: number;
  preview: string;
  artifact: ConversationArtifactRef | null;
  messages: UIMessage[];
};

/** Sidebar / list projection — same as marketplace: Omit<Envelope, "messages">. */
export type ConversationListSummary = Omit<ConversationEnvelope, "messages">;
