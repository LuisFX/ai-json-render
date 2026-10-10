"use client";

import { useState, useCallback, useRef, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  SPEC_DATA_PART,
  createStateStore,
  type Spec,
  type SpecDataPart,
} from "@json-render/core";
import { useJsonRenderMessage } from "@json-render/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { HistorySidebar } from "@/components/history-sidebar/history-sidebar";
import { ArtifactPanel } from "@/components/artifact-panel";
import { ChatSplit } from "@/components/chat-split";
import type { ConversationSummary } from "@/lib/conversation-summary";
import type { ConversationEnvelope } from "@/lib/conversation/store-schema";
import { exportConversationTrace, listSpecVersions } from "@/lib/export-trace";
import type { SpecVersion } from "@/lib/export-trace";
import {
  foldSpecTimeline,
  formatPatchSummary,
  type SpecTurn,
} from "@/lib/spec-timeline";
import {
  ExportSpecDialog,
  type ExportSpecChoice,
} from "@/components/export-spec-dialog";
import { createAiSdkStateBridge } from "@/lib/ai-sdk-state-bridge";
import { statePathsOnlyPrompt } from "@/lib/state-paths-only-prompt";
import { validateFrozenSpec } from "@/lib/validate-frozen-spec";
import {
  DEFAULT_OPENAI_MODEL_ID,
  clampEffort,
  getEnabledOpenAIModels,
  getModelRow,
  type ReasoningEffort,
} from "@/lib/openai-model-matrix";
import {
  fromOpencodeModelId,
  toOpencodeModelId,
  type ChatProvider,
} from "@/lib/chat-provider";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Download,
  FileJson,
  Globe,
  Info,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

type AppDataParts = { [SPEC_DATA_PART]: SpecDataPart };
type AppMessage = UIMessage<
  {
    opencodeSessionId?: string;
    opencodeCost?: number;
    opencodeMessageId?: string;
  },
  AppDataParts
>;

// =============================================================================
// Transport
// =============================================================================

const transport = new DefaultChatTransport({ api: "/api/generate" });

// =============================================================================
// Suggestions (shown in empty state)
// =============================================================================

const SUGGESTIONS = [
  {
    label: "Weather comparison",
    prompt: "Compare the weather in New York, London, and Tokyo",
  },
  {
    label: "GitHub repo stats",
    prompt: "Show me stats for the vercel/next.js and vercel/ai GitHub repos",
  },
  {
    label: "Crypto dashboard",
    prompt: "Build a crypto dashboard for Bitcoin, Ethereum, and Solana",
  },
  {
    label: "Hacker News top stories",
    prompt: "Show me the top 15 Hacker News stories right now",
  },
];

// =============================================================================
// Tool Call Display
// =============================================================================

/** Readable labels for tool names: [loading, done] */
const TOOL_LABELS: Record<string, [string, string]> = {
  getWeather: ["Getting weather data", "Got weather data"],
  getGitHubRepo: ["Fetching GitHub repo", "Fetched GitHub repo"],
  getGitHubPullRequests: ["Fetching pull requests", "Fetched pull requests"],
  getCryptoPrice: ["Looking up crypto price", "Looked up crypto price"],
  getCryptoPriceHistory: ["Fetching price history", "Fetched price history"],
  getHackerNewsTop: ["Loading Hacker News", "Loaded Hacker News"],
  webSearch: ["Searching the web", "Searched the web"],
};

function ToolCallDisplay({
  toolName,
  state,
  result,
}: {
  toolName: string;
  state: string;
  result: unknown;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLoading =
    state !== "output-available" &&
    state !== "output-error" &&
    state !== "output-denied";
  const labels = TOOL_LABELS[toolName];
  const label = labels ? (isLoading ? labels[0] : labels[1]) : toolName;

  return (
    <div className="text-sm group">
      <button
        type="button"
        className="flex items-center gap-1.5"
        onClick={() => setExpanded((e) => !e)}
      >
        <span
          className={`text-muted-foreground ${isLoading ? "animate-shimmer" : ""}`}
        >
          {label}
        </span>
        {!isLoading && (
          <ChevronRight
            className={`h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-all ${expanded ? "rotate-90" : ""}`}
          />
        )}
      </button>
      {expanded && !isLoading && result != null && (
        <div className="mt-1 max-h-64 overflow-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
            {typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Message Bubble
// =============================================================================

function MessageBubble({
  message,
  isLast,
  isStreaming,
  turn,
  selected,
  onSelectVersion,
}: {
  message: AppMessage;
  isLast: boolean;
  isStreaming: boolean;
  turn?: SpecTurn;
  selected?: boolean;
  onSelectVersion?: (version: number) => void;
}) {
  const isUser = message.role === "user";
  const { text } = useJsonRenderMessage(message.parts);

  // Build ordered segments from parts, collapsing adjacent text and adjacent tools.
  // Spec patches render in the artifact sidebar, not inside the bubble.
  const segments: Array<
    | { kind: "text"; text: string }
    | {
        kind: "tools";
        tools: Array<{
          toolCallId: string;
          toolName: string;
          state: string;
          output?: unknown;
        }>;
      }
  > = [];

  for (const part of message.parts) {
    if (part.type === "text") {
      if (!part.text.trim()) continue;
      // Standalone: leftover JSON dumps are not conversation. Keep only prose.
      const trimmed = part.text.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) continue;
      const last = segments[segments.length - 1];
      if (last?.kind === "text") {
        last.text += part.text;
      } else {
        segments.push({ kind: "text", text: part.text });
      }
    } else if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
      // OpenCode provider emits dynamic tool parts (server-executed).
      const tp = part as {
        type: string;
        toolCallId: string;
        toolName?: string;
        state: string;
        output?: unknown;
      };
      const toolName =
        tp.type === "dynamic-tool"
          ? (tp.toolName ?? "dynamic-tool")
          : tp.type.replace(/^tool-/, "");
      const last = segments[segments.length - 1];
      if (last?.kind === "tools") {
        last.tools.push({
          toolCallId: tp.toolCallId,
          toolName,
          state: tp.state,
          output: tp.output,
        });
      } else {
        segments.push({
          kind: "tools",
          tools: [
            {
              toolCallId: tp.toolCallId,
              toolName,
              state: tp.state,
              output: tp.output,
            },
          ],
        });
      }
    }
  }

  const hasAnything = segments.length > 0 || turn != null;
  const showLoader =
    isLast && isStreaming && message.role === "assistant" && !hasAnything;

  if (isUser) {
    return (
      <div className="flex justify-end">
        {text && (
          <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-primary text-primary-foreground rounded-tr-md">
            {text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          const isLastSegment = i === segments.length - 1;
          return (
            <div
              key={`text-${i}`}
              className="text-sm leading-relaxed [&_p+p]:mt-3 [&_ul]:mt-2 [&_ol]:mt-2 [&_pre]:mt-2"
            >
              <Streamdown
                plugins={{ code }}
                animated={isLast && isStreaming && isLastSegment}
              >
                {seg.text}
              </Streamdown>
            </div>
          );
        }
        return (
          <div key={`tools-${i}`} className="flex flex-col gap-1">
            {seg.tools.map((t) => (
              <ToolCallDisplay
                key={t.toolCallId}
                toolName={t.toolName}
                state={t.state}
                result={t.output}
              />
            ))}
          </div>
        );
      })}

      {turn && (
        <button
          type="button"
          onClick={() => onSelectVersion?.(turn.version)}
          className={cn(
            "w-full rounded-lg border px-3 py-2 text-left transition-colors",
            selected
              ? "border-primary/40 bg-primary/10"
              : "border-border hover:bg-accent",
          )}
        >
          <div className="text-sm font-medium">Version {turn.version}</div>
          <div className="text-xs text-muted-foreground">
            {formatPatchSummary(turn.summary)}
          </div>
        </button>
      )}

      {showLoader && (
        <div className="text-sm text-muted-foreground animate-shimmer">
          Thinking...
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Page — conversation id comes from the URL (`/c/[id]`), not React state.
// =============================================================================

function initialProvider(): Exclude<ChatProvider, "gateway"> {
  const p = process.env.NEXT_PUBLIC_AI_PROVIDER?.toLowerCase();
  if (p === "opencode") return "opencode";
  return "openai";
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: conversationId } = use(params);
  const router = useRouter();
  const [input, setInput] = useState("");
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [jevComposer, setJevComposer] = useState(false);
  const [chatProvider, setChatProvider] =
    useState<Exclude<ChatProvider, "gateway">>(initialProvider);
  const [modelId, setModelId] = useState(() => {
    const envOc = process.env.NEXT_PUBLIC_OPENCODE_MODEL;
    if (initialProvider() === "opencode" && envOc) {
      return fromOpencodeModelId(envOc);
    }
    return DEFAULT_OPENAI_MODEL_ID;
  });
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(
    () => clampEffort(DEFAULT_OPENAI_MODEL_ID, undefined) ?? "none",
  );
  const enabledModels = useMemo(() => getEnabledOpenAIModels(), []);
  const selectedModelRow = useMemo(() => getModelRow(modelId), [modelId]);
  const showReasoningSelect = (selectedModelRow?.efforts.length ?? 0) > 0;
  const showModelSelectors =
    process.env.NEXT_PUBLIC_AI_PROVIDER?.toLowerCase() !== "gateway";
  const [chats, setChats] = useState<ConversationSummary[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [bootstrapped, setBootstrapped] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [frozenSpec, setFrozenSpec] = useState<Spec | null>(null);
  const [storeEpoch, setStoreEpoch] = useState(0);
  const [modeBanner, setModeBanner] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [exportDialog, setExportDialog] = useState<{
    envelope: ConversationEnvelope;
    versions: SpecVersion[];
    includeFrozen: boolean;
  } | null>(null);
  const [continueFromVersion, setContinueFromVersion] = useState<number | null>(
    null,
  );
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [followLatest, setFollowLatest] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isStickToBottom = useRef(true);
  const isAutoScrolling = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationIdRef = useRef(conversationId);
  const prevStatusRef = useRef<string>("ready");
  const partCursorRef = useRef({ messageId: "", index: 0 });
  const skipExistingPartsRef = useRef(false);
  /** Persist OpenCode session across turns within one conversation route. */
  const opencodeSessionIdRef = useRef<string | undefined>(undefined);

  const bridgeStore = useMemo(() => createStateStore({}), [storeEpoch]);
  const bridge = useMemo(
    () => createAiSdkStateBridge({ store: bridgeStore }),
    [bridgeStore],
  );
  const modeB = frozenSpec != null;
  const stateFillSystem = useMemo(
    () => (frozenSpec ? statePathsOnlyPrompt(frozenSpec) : ""),
    [frozenSpec],
  );

  const { messages, sendMessage, setMessages, status, error } =
    useChat<AppMessage>({ transport });

  const timeline = useMemo(() => foldSpecTimeline(messages), [messages]);
  const latestVersion = timeline.at(-1)?.version ?? null;
  const displayVersion = followLatest ? latestVersion : selectedVersion;

  useEffect(() => {
    if (followLatest && latestVersion != null) {
      setSelectedVersion(latestVersion);
    }
  }, [followLatest, latestVersion]);

  useEffect(() => {
    setContinueFromVersion(null);
    setFollowLatest(true);
    setSelectedVersion(null);
  }, [conversationId]);

  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const meta = messages[i]?.metadata;
      if (meta?.opencodeSessionId) {
        opencodeSessionIdRef.current = meta.opencodeSessionId;
        break;
      }
    }
  }, [messages]);

  const isStreaming = status === "streaming" || status === "submitted";

  const clearModeB = useCallback(() => {
    setFrozenSpec(null);
    setStoreEpoch((n) => n + 1);
    partCursorRef.current = { messageId: "", index: 0 };
    skipExistingPartsRef.current = false;
    setModeBanner(null);
    setPasteOpen(false);
    setPasteText("");
  }, []);

  const enterModeB = useCallback(
    (spec: Spec, warnings: string[]) => {
      if (jevComposer) {
        toast.error("Jev cannot fill a frozen spec. Turn Jev off first.");
        return;
      }
      setFrozenSpec(spec);
      setStoreEpoch((n) => n + 1);
      skipExistingPartsRef.current = true;
      const warn = warnings.length > 0 ? ` Warning: ${warnings.join(" ")}` : "";
      setModeBanner(`Mode B — state fill.${warn}`);
      setPasteOpen(false);
      setPasteText("");
    },
    [jevComposer],
  );

  useEffect(() => {
    if (!modeB) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) {
      if (skipExistingPartsRef.current) {
        partCursorRef.current = { messageId: "", index: 0 };
        skipExistingPartsRef.current = false;
      }
      return;
    }
    if (skipExistingPartsRef.current) {
      partCursorRef.current = {
        messageId: last.id,
        index: last.parts.length,
      };
      skipExistingPartsRef.current = false;
      return;
    }
    if (last.id !== partCursorRef.current.messageId) {
      partCursorRef.current = { messageId: last.id, index: 0 };
    }
    const from = partCursorRef.current.index;
    if (last.parts.length <= from) return;
    const slice = last.parts.slice(from) as Array<{
      type: string;
      data?: unknown;
    }>;
    bridge.applyParts(slice);
    partCursorRef.current.index = last.parts.length;
  }, [messages, modeB, bridge]);

  const refreshChats = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (!res.ok) return;
    const rows = (await res.json()) as ConversationSummary[];
    setChats(rows);
  }, []);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Load the conversation named by the URL. Id change clears opencode session.
  useEffect(() => {
    let cancelled = false;
    opencodeSessionIdRef.current = undefined;
    setBootstrapped(false);
    setLoadError(null);
    setInput("");
    clearModeB();

    (async () => {
      const envRes = await fetch(`/api/conversations/${conversationId}`);
      if (cancelled) return;
      if (!envRes.ok) {
        setLoadError(`Conversation ${conversationId} not found`);
        setMessages([]);
        setBootstrapped(true);
        await refreshChats();
        return;
      }
      const envelope = (await envRes.json()) as ConversationEnvelope;
      setMessages(envelope.messages as AppMessage[]);
      await refreshChats();
      if (!cancelled) setBootstrapped(true);
      inputRef.current?.focus();
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, refreshChats, setMessages, clearModeB]);

  useEffect(() => {
    const wasBusy =
      prevStatusRef.current === "streaming" ||
      prevStatusRef.current === "submitted";
    const nowIdle = status === "ready" || status === "error";
    prevStatusRef.current = status;
    if (!wasBusy || !nowIdle) return;
    const id = conversationIdRef.current;
    if (!id || messages.length === 0) return;
    void (async () => {
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, messages }),
      });
      await refreshChats();
    })();
  }, [status, messages, refreshChats]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const THRESHOLD = 80;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollTop + clientHeight >= scrollHeight - THRESHOLD;

      if (isAutoScrolling.current) {
        if (atBottom) {
          isAutoScrolling.current = false;
        }
        return;
      }

      isStickToBottom.current = atBottom;
      setShowScrollButton(!atBottom);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isStickToBottom.current) return;
    isAutoScrolling.current = true;
    container.scrollTop = container.scrollHeight;
    requestAnimationFrame(() => {
      isAutoScrolling.current = false;
    });
  }, [messages, isStreaming]);

  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    isStickToBottom.current = true;
    setShowScrollButton(false);
    isAutoScrolling.current = true;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, []);

  const handleSelect = useCallback(
    async (id: string) => {
      if (id === conversationIdRef.current || isStreaming) return;
      const currentId = conversationIdRef.current;
      if (currentId && messages.length > 0) {
        await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: currentId, messages }),
        });
      }
      router.push(`/c/${id}`);
    },
    [isStreaming, messages, router],
  );

  const handleNew = useCallback(async () => {
    if (isStreaming) return;
    const currentId = conversationIdRef.current;
    if (currentId && messages.length > 0) {
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentId, messages }),
      });
    }
    const createRes = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ create: true }),
    });
    const created = (await createRes.json()) as { id: string };
    router.push(`/c/${created.id}`);
  }, [isStreaming, messages, router]);

  const handleRename = useCallback(
    async (id: string) => {
      const current = chats.find((c) => c.id === id);
      const next = window.prompt(
        "Rename conversation",
        current?.name ?? current?.title ?? "",
      );
      if (next == null) return;
      const name = next.trim() || null;
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await refreshChats();
    },
    [chats, refreshChats],
  );

  const handleTogglePinned = useCallback(
    async (id: string) => {
      const current = chats.find((c) => c.id === id);
      const pinnedAt = current?.pinnedAt ? null : new Date().toISOString();
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedAt }),
      });
      await refreshChats();
    },
    [chats, refreshChats],
  );

  const handleArchive = useCallback(
    async (id: string) => {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivedAt: new Date().toISOString() }),
      });
      if (id === conversationIdRef.current) {
        await handleNew();
      } else {
        await refreshChats();
      }
    },
    [handleNew, refreshChats],
  );

  const handleExport = useCallback(
    async (id: string) => {
      if (id === conversationIdRef.current) {
        await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, messages }),
        });
      }
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) return;
      const envelope = (await res.json()) as ConversationEnvelope;
      const versions = listSpecVersions(envelope.messages as UIMessage[]);
      const includeFrozen =
        id === conversationIdRef.current && frozenSpec != null;

      if (versions.length === 0 && !includeFrozen) {
        await exportConversationTrace(envelope);
        toast.message(
          "Exported envelope only — no Spec versions in this conversation",
        );
        return;
      }

      if (versions.length === 1 && !includeFrozen) {
        await exportConversationTrace(envelope, { version: 1 });
        toast.success("Exported Spec v1");
        return;
      }

      setExportDialog({ envelope, versions, includeFrozen });
    },
    [messages, frozenSpec],
  );

  const handleExportConfirm = useCallback(
    async (choice: ExportSpecChoice) => {
      const pending = exportDialog;
      setExportDialog(null);
      if (!pending) return;
      if (choice.kind === "frozen") {
        await exportConversationTrace(pending.envelope, {
          spec: choice.spec,
          label: "frozen",
        });
        toast.success("Exported frozen Spec (Mode B)");
        return;
      }
      await exportConversationTrace(pending.envelope, {
        version: choice.version,
      });
      toast.success(`Exported Spec v${choice.version}`);
    },
    [exportDialog],
  );

  const handleSubmit = useCallback(
    async (text?: string) => {
      const message = text || input;
      if (!message.trim() || isStreaming || !conversationIdRef.current) return;
      if (loadError) return;
      if (jevComposer && modeB) {
        toast.error(
          "Jev cannot fill a frozen spec. Clear the uploaded Spec first.",
        );
        return;
      }
      setInput("");
      const modelBody = showModelSelectors
        ? {
            modelId:
              chatProvider === "opencode"
                ? toOpencodeModelId(modelId)
                : modelId,
            ...(showReasoningSelect ? { reasoningEffort } : {}),
          }
        : {};
      const opencodeBody =
        chatProvider === "opencode" && opencodeSessionIdRef.current
          ? { sessionId: opencodeSessionIdRef.current }
          : {};
      const common = {
        webSearch: webSearchEnabled,
        conversationId: conversationIdRef.current,
        provider: chatProvider,
        ...modelBody,
        ...opencodeBody,
      };
      const specForEdit =
        continueFromVersion != null
          ? timeline.find((t) => t.version === continueFromVersion)?.spec
          : timeline.at(-1)?.spec;
      if (jevComposer) {
        setContinueFromVersion(null);
        setFollowLatest(true);
        await sendMessage(
          { text: message.trim() },
          {
            body: {
              conversationId: conversationIdRef.current,
              composer: "jev",
              mode: "generate",
              currentSpec: specForEdit,
            },
          },
        );
        return;
      }
      if (modeB) {
        await sendMessage(
          { text: message.trim() },
          {
            body: {
              ...common,
              mode: "state-fill",
              stateFillSystem,
            },
          },
        );
        return;
      }
      setContinueFromVersion(null);
      setFollowLatest(true);
      await sendMessage(
        { text: message.trim() },
        {
          body: {
            ...common,
            mode: "generate",
            currentSpec: specForEdit,
          },
        },
      );
    },
    [
      input,
      isStreaming,
      loadError,
      sendMessage,
      webSearchEnabled,
      jevComposer,
      modeB,
      stateFillSystem,
      showModelSelectors,
      modelId,
      reasoningEffort,
      chatProvider,
      timeline,
      continueFromVersion,
    ],
  );

  const handleUploadFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const text = await file.text();
        const raw = JSON.parse(text) as unknown;
        const result = validateFrozenSpec(raw);
        if (!result.ok) {
          setModeBanner(`Upload failed: ${result.error}`);
          return;
        }
        enterModeB(result.spec, result.warnings);
      } catch {
        setModeBanner("Upload failed: invalid JSON");
      }
    },
    [enterModeB],
  );

  const handlePasteApply = useCallback(() => {
    try {
      const raw = JSON.parse(pasteText) as unknown;
      const result = validateFrozenSpec(raw);
      if (!result.ok) {
        setModeBanner(`Paste failed: ${result.error}`);
        return;
      }
      enterModeB(result.spec, result.warnings);
    } catch {
      setModeBanner("Paste failed: invalid JSON");
    }
  }, [pasteText, enterModeB]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setInput("");
    opencodeSessionIdRef.current = undefined;
    setContinueFromVersion(null);
    setFollowLatest(true);
    setSelectedVersion(null);
    inputRef.current?.focus();
  }, [setMessages]);

  const handleSelectVersion = useCallback(
    (version: number) => {
      setSelectedVersion(version);
      setFollowLatest(version === latestVersion);
    },
    [latestVersion],
  );

  const handleContinueFrom = useCallback((version: number) => {
    setContinueFromVersion(version);
    toast.message(`Next edit will patch v${version}`);
  }, []);

  const turnsByMessageId = useMemo(() => {
    const map = new Map<string, SpecTurn>();
    for (const turn of timeline) map.set(turn.messageId, turn);
    return map;
  }, [timeline]);

  const isEmpty = messages.length === 0;
  const hasArtifact = timeline.length > 0 || modeB;

  return (
    <div className="h-screen flex overflow-hidden">
      <HistorySidebar
        chats={chats}
        activeId={conversationId}
        collapsed={sidebarCollapsed}
        query={sidebarQuery}
        onSelect={handleSelect}
        onNew={handleNew}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
        onQueryChange={setSidebarQuery}
        onArchive={handleArchive}
        onRename={handleRename}
        onTogglePinned={handleTogglePinned}
        onExport={handleExport}
        emptyCopy="No conversations yet. Start typing to begin."
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b px-6 py-3 flex items-center justify-between flex-shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold shrink-0">Chat Standalone</h1>
            <code
              className="text-[10px] text-muted-foreground truncate max-w-[14rem]"
              title={conversationId}
            >
              {conversationId}
            </code>
            {!bootstrapped && (
              <span className="text-xs text-muted-foreground">Loading…</span>
            )}
            {loadError && (
              <span className="text-xs text-destructive truncate">
                {loadError}
              </span>
            )}
            {modeBanner && (
              <span className="text-xs text-muted-foreground truncate">
                {modeBanner}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void handleUploadFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={jevComposer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none"
              title={
                jevComposer
                  ? "Jev cannot fill a frozen spec"
                  : "Upload frozen Spec JSON (Mode B)"
              }
            >
              <FileJson className="h-3.5 w-3.5" />
              Upload Spec
            </button>
            <button
              type="button"
              onClick={() => void handleExport(conversationId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Export envelope + Spec (pick version when multiple)"
            >
              <Download className="h-3.5 w-3.5" />
              Export Spec
            </button>
            <button
              type="button"
              onClick={() => setPasteOpen((o) => !o)}
              disabled={jevComposer}
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none"
              title={
                jevComposer ? "Jev cannot fill a frozen spec" : "Paste Spec"
              }
            >
              Paste Spec
            </button>
            {modeB && (
              <button
                type="button"
                onClick={clearModeB}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Clear Spec
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Clear messages
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>

        {pasteOpen && (
          <div className="border-b px-6 py-3 bg-muted/30 flex-shrink-0 space-y-2">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder='Paste Spec JSON: { "root": "...", "elements": { ... } }'
              rows={5}
              className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePasteApply}
                className="px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground"
              >
                Apply Spec
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasteOpen(false);
                  setPasteText("");
                }}
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <ChatSplit
          hasArtifact={hasArtifact}
          transcript={
            <div className="flex h-full min-h-0 flex-col">
              <main
                ref={scrollContainerRef}
                className="min-h-0 flex-1 overflow-auto"
              >
                {isEmpty ? (
                  <div className="h-full flex flex-col items-center justify-center px-6 py-12">
                    <div className="max-w-2xl w-full space-y-8">
                      <div className="text-center space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight">
                          What would you like to explore?
                        </h2>
                        <p className="text-muted-foreground">
                          Ask about weather, GitHub repos, crypto prices, or
                          Hacker News -- the agent will fetch real data and
                          patch a dashboard in the artifact pane.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-center">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s.label}
                            onClick={() => handleSubmit(s.prompt)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            <Sparkles className="h-3 w-3" />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
                    {messages.map((message, index) => {
                      const turn = turnsByMessageId.get(message.id);
                      return (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          isLast={index === messages.length - 1}
                          isStreaming={isStreaming}
                          turn={turn}
                          selected={
                            turn != null && turn.version === displayVersion
                          }
                          onSelectVersion={handleSelectVersion}
                        />
                      );
                    })}

                    {error && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error.message}
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </main>

              <div className="relative flex-shrink-0 bg-background px-4 pb-3">
                {showScrollButton && !isEmpty && (
                  <button
                    onClick={scrollToBottom}
                    className="absolute left-1/2 -translate-x-1/2 -top-10 z-10 h-8 w-8 rounded-full border border-border bg-background text-muted-foreground shadow-md flex items-center justify-center hover:text-foreground hover:bg-accent transition-colors"
                    aria-label="Scroll to bottom"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                )}
                <div className="relative mx-auto max-w-3xl">
                  <div className="rounded-xl border border-input bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        jevComposer
                          ? isEmpty
                            ? "Jev: compare NYC/London/Tokyo weather, crypto, GitHub…"
                            : "Jev follow-up edits the last Spec from prepared recipes…"
                          : modeB
                            ? "Ask to refill state for the frozen Spec…"
                            : isEmpty
                              ? "e.g., Compare weather in NYC, London, and Tokyo..."
                              : "Ask a follow-up to patch the UI..."
                      }
                      rows={2}
                      className="w-full resize-none rounded-t-xl bg-transparent px-4 pt-3 pb-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
                      autoFocus
                    />
                    <div className="flex items-center justify-between gap-2 px-3 pb-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          aria-label="Jev (experimental)"
                          aria-pressed={jevComposer}
                          title="Experimental. Jev composes UI from prepared sample weather, GitHub, crypto, and Hacker News recipes. It cannot fetch live tools, invent copy, or fill a frozen spec."
                          onClick={() => {
                            if (!jevComposer && modeB) {
                              toast.error(
                                "Jev cannot fill a frozen spec. Clear the uploaded Spec first.",
                              );
                              return;
                            }
                            setJevComposer((on) => !on);
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                            jevComposer
                              ? "border-primary/40 bg-primary/10 text-foreground"
                              : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                          )}
                        >
                          jev
                          <Info className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        {!jevComposer && (
                          <button
                            type="button"
                            onClick={() =>
                              setWebSearchEnabled((enabled) => !enabled)
                            }
                            aria-pressed={webSearchEnabled}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                              webSearchEnabled
                                ? "border-primary/40 bg-primary/10 text-foreground"
                                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                            )}
                          >
                            <Globe className="h-3.5 w-3.5" />
                            Web search
                          </button>
                        )}
                        {showModelSelectors && !jevComposer && (
                          <>
                            <select
                              value={chatProvider}
                              onChange={(e) => {
                                const next = e.target.value as
                                  | "openai"
                                  | "opencode";
                                setChatProvider(next);
                                opencodeSessionIdRef.current = undefined;
                              }}
                              className="h-7 rounded-full border border-border bg-background px-2 text-xs text-foreground"
                              aria-label="Provider"
                            >
                              <option value="openai">OpenAI (AI SDK)</option>
                              <option value="opencode">OpenCode serve</option>
                            </select>
                            <select
                              value={modelId}
                              onChange={(e) => {
                                const nextId = e.target.value;
                                setModelId(nextId);
                                const nextEffort = clampEffort(
                                  nextId,
                                  reasoningEffort,
                                );
                                if (nextEffort) setReasoningEffort(nextEffort);
                              }}
                              className="h-7 max-w-[10rem] rounded-full border border-border bg-background px-2 text-xs text-foreground"
                              aria-label="Model"
                            >
                              {enabledModels.map((row) => (
                                <option key={row.id} value={row.id}>
                                  {row.label}
                                </option>
                              ))}
                            </select>
                            {showReasoningSelect && (
                              <select
                                value={reasoningEffort}
                                onChange={(e) =>
                                  setReasoningEffort(
                                    e.target.value as ReasoningEffort,
                                  )
                                }
                                className="h-7 rounded-full border border-border bg-background px-2 text-xs text-foreground"
                                aria-label="Reasoning effort"
                              >
                                {selectedModelRow!.efforts.map((effort) => (
                                  <option key={effort} value={effort}>
                                    {effort}
                                  </option>
                                ))}
                              </select>
                            )}
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => handleSubmit()}
                        disabled={
                          !input.trim() ||
                          isStreaming ||
                          !bootstrapped ||
                          !!loadError
                        }
                        className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isStreaming ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
          artifact={
            <ArtifactPanel
              turns={timeline}
              selectedVersion={displayVersion}
              continueFromVersion={continueFromVersion}
              onSelectVersion={handleSelectVersion}
              onContinueFrom={handleContinueFrom}
              frozenSpec={frozenSpec}
              store={bridgeStore}
              loading={isStreaming}
              onExport={() => void handleExport(conversationId)}
            />
          }
        />
      </div>

      <ExportSpecDialog
        open={exportDialog != null}
        versions={exportDialog?.versions ?? []}
        frozenSpec={exportDialog?.includeFrozen ? frozenSpec : null}
        onCancel={() => setExportDialog(null)}
        onConfirm={(choice) => void handleExportConfirm(choice)}
      />
    </div>
  );
}
