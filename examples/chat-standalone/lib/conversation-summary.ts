/**
 * SS-021a (Single Surface) — the chat-history CONTENT CONTRACT. The shared sidebar renders exactly these
 * fields; each surface supplies its OWN richer summary (marketplace authoring/testing chats; consumer
 * patient chats with execution runs — D6) that is structurally assignable to this. Decoupled from any app's
 * storage envelope: this is a supertype, so a consumer's fuller type drops in without coupling.
 */

/** Bound artifact (protocol / agent / …). Null / absent = free chat. */
export type ConversationArtifactRef = {
  id: string;
  kind: string;
  title?: string;
  slug?: string;
};

export type ConversationSummary = {
  id: string;
  title: string;
  name: string | null;
  preview: string;
  createdAt: string;
  updatedAt: string;
  pinnedAt: string | null;
  messageCount: number;
  artifact?: ConversationArtifactRef | null;
  badges?: Array<{ id: string; label: string }>;
};
