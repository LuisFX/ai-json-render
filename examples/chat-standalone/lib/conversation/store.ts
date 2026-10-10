import { generateId, type UIMessage } from "ai";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ConversationSummary } from "@/lib/conversation-summary";
import {
  ConversationEnvelopeSchema,
  type ConversationEnvelope,
  type ConversationListSummary,
} from "@/lib/conversation/store-schema";

/**
 * Local JSONL conversation store for the chat example lab.
 * One ConversationEnvelope per line — Meridian-aligned keys, filesystem instead of f1-api.
 */

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../data");
const STORE_PATH = join(DATA_DIR, "conversations.jsonl");

function ensureDataDir() {
  mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): ConversationEnvelope[] {
  ensureDataDir();
  if (!existsSync(STORE_PATH)) return [];
  const raw = readFileSync(STORE_PATH, "utf8");
  if (!raw.trim()) return [];
  const out: ConversationEnvelope[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed = ConversationEnvelopeSchema.safeParse(JSON.parse(trimmed));
    if (!parsed.success) continue;
    out.push(normalizeEnvelope(parsed.data as ConversationEnvelope));
  }
  return out;
}

function writeAll(envelopes: ConversationEnvelope[]) {
  ensureDataDir();
  const body =
    envelopes.map((e) => JSON.stringify(e)).join("\n") +
    (envelopes.length ? "\n" : "");
  writeFileSync(STORE_PATH, body, "utf8");
}

export function normalizeEnvelope(
  raw:
    | ConversationEnvelope
    | (Omit<ConversationEnvelope, "messages"> & { messages: unknown[] }),
): ConversationEnvelope {
  return {
    id: raw.id,
    title: raw.title,
    name: raw.name ?? null,
    forkedFrom: raw.forkedFrom ?? null,
    ownerSlug: raw.ownerSlug ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    pinnedAt: raw.pinnedAt ?? null,
    archivedAt: raw.archivedAt ?? null,
    messageCount: raw.messageCount,
    preview: raw.preview,
    artifact: raw.artifact ?? null,
    messages: (raw.messages ?? []) as UIMessage[],
  };
}

function deriveTitle(messages: UIMessage[]): string {
  for (const m of messages) {
    if (m.role !== "user") continue;
    const text = m.parts.find((p) => p.type === "text") as
      | { text?: string }
      | undefined;
    if (text?.text) return text.text.slice(0, 80);
  }
  return "New conversation";
}

function derivePreview(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = messages[i]?.parts.find((p) => p.type === "text") as
      | { text?: string }
      | undefined;
    if (text?.text) return text.text.slice(0, 120);
  }
  return "";
}

/** Map envelope list row → SS-021a HistorySidebar ConversationSummary. */
export function toSidebarSummary(
  row: ConversationListSummary,
): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    name: row.name,
    preview: row.preview,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    pinnedAt: row.pinnedAt,
    messageCount: row.messageCount,
    artifact: row.artifact,
  };
}

export async function createChat(): Promise<string> {
  const id = `conv_${generateId()}`;
  const now = new Date().toISOString();
  const envelope = normalizeEnvelope({
    id,
    title: "New conversation",
    name: null,
    forkedFrom: null,
    ownerSlug: null,
    createdAt: now,
    updatedAt: now,
    pinnedAt: null,
    archivedAt: null,
    messageCount: 0,
    preview: "",
    artifact: null,
    messages: [],
  });
  const all = readAll();
  all.push(envelope);
  writeAll(all);
  return id;
}

export async function loadEnvelope(
  id: string,
): Promise<ConversationEnvelope | null> {
  const found = readAll().find((e) => e.id === id);
  return found ? normalizeEnvelope(found) : null;
}

export async function listChats(): Promise<ConversationListSummary[]> {
  return readAll()
    .filter((e) => e.archivedAt == null)
    .map(({ messages: _messages, ...summary }) => summary)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveChat({
  chatId,
  messages,
}: {
  chatId: string;
  messages: UIMessage[];
}): Promise<ConversationEnvelope> {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === chatId);
  const existing = idx >= 0 ? all[idx] : null;
  const now = new Date().toISOString();
  const envelope = normalizeEnvelope({
    id: chatId,
    title:
      existing?.title && existing.title !== "New conversation"
        ? existing.title
        : deriveTitle(messages),
    name: existing?.name ?? null,
    forkedFrom: existing?.forkedFrom ?? null,
    ownerSlug: existing?.ownerSlug ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    pinnedAt: existing?.pinnedAt ?? null,
    archivedAt: existing?.archivedAt ?? null,
    messageCount: messages.length,
    preview: derivePreview(messages),
    artifact: existing?.artifact ?? null,
    messages,
  });
  const parsed = ConversationEnvelopeSchema.safeParse(envelope);
  if (!parsed.success) {
    throw new Error(`Invalid conversation envelope: ${parsed.error.message}`);
  }
  if (idx >= 0) all[idx] = envelope;
  else all.push(envelope);
  writeAll(all);
  return envelope;
}

export async function patchMeta(
  id: string,
  patch: {
    name?: string | null;
    pinnedAt?: string | null;
    archivedAt?: string | null;
  },
): Promise<ConversationEnvelope | null> {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const current = all[idx];
  if (!current) return null;
  const next = normalizeEnvelope({
    ...current,
    name: patch.name !== undefined ? patch.name : current.name,
    pinnedAt: patch.pinnedAt !== undefined ? patch.pinnedAt : current.pinnedAt,
    archivedAt:
      patch.archivedAt !== undefined ? patch.archivedAt : current.archivedAt,
    updatedAt: new Date().toISOString(),
    messages: current.messages,
  });
  all[idx] = next;
  writeAll(all);
  return next;
}
