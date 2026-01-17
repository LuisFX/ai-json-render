"use client";

import { useState, useCallback } from "react";
import {
  DataProvider,
  ActionProvider,
  VisibilityProvider,
  useUIStream,
  Renderer,
} from "@json-render/react";
import { componentRegistry } from "@/components/ui";
import { generateNextJSProject, type ExportedFile } from "@/lib/codegen";
import {
  CodeHighlight,
  getLanguageFromPath,
} from "@/components/code-highlight";

const INITIAL_DATA = {
  analytics: {
    revenue: 125000,
    growth: 0.15,
    customers: 1234,
    orders: 567,
    salesByRegion: [
      { label: "US", value: 45000 },
      { label: "EU", value: 35000 },
      { label: "Asia", value: 28000 },
      { label: "Other", value: 17000 },
    ],
    recentTransactions: [
      {
        id: "TXN001",
        customer: "Acme Corp",
        amount: 1500,
        status: "completed",
        date: "2024-01-15",
      },
      {
        id: "TXN002",
        customer: "Globex Inc",
        amount: 2300,
        status: "pending",
        date: "2024-01-14",
      },
      {
        id: "TXN003",
        customer: "Initech",
        amount: 890,
        status: "completed",
        date: "2024-01-13",
      },
      {
        id: "TXN004",
        customer: "Umbrella Co",
        amount: 4200,
        status: "completed",
        date: "2024-01-12",
      },
    ],
  },
  form: {
    dateRange: "",
    region: "",
  },
};

const ACTION_HANDLERS = {
  export_report: () => alert("Exporting report..."),
  refresh_data: () => alert("Refreshing data..."),
  view_details: (params: Record<string, unknown>) =>
    alert(`Details: ${JSON.stringify(params)}`),
  apply_filter: () => alert("Applying filters..."),
};

function DashboardContent() {
  const [prompt, setPrompt] = useState("");
  const [showCodeExport, setShowCodeExport] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { tree, isStreaming, error, send, clear } = useUIStream({
    api: "/api/generate",
    onError: (err) => console.error("Generation error:", err),
  });

  const exportedFiles = tree
    ? generateNextJSProject(tree, {
        projectName: "my-dashboard",
        data: INITIAL_DATA,
      })
    : [];

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prompt.trim()) return;
      await send(prompt, { data: INITIAL_DATA });
    },
    [prompt, send],
  );

  const downloadAllFiles = useCallback(() => {
    // Create a simple zip-like download by creating individual file downloads
    // For a real implementation, you'd use a library like JSZip
    const allContent = exportedFiles
      .map((f) => `// ========== ${f.path} ==========\n${f.content}`)
      .join("\n\n");

    const blob = new Blob([allContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-dashboard-project.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [exportedFiles]);

  const copyFileContent = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  const examples = [
    "Revenue dashboard with metrics and chart",
    "Recent transactions table",
    "Customer count with trend",
  ];

  const hasElements = tree && Object.keys(tree.elements).length > 0;

  // Auto-select first file when modal opens
  const activeFile =
    selectedFile || (exportedFiles.length > 0 ? exportedFiles[0]?.path : null);
  const activeFileContent = exportedFiles.find(
    (f) => f.path === activeFile,
  )?.content;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <header style={{ marginBottom: 48 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Dashboard
        </h1>
        <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 16 }}>
          Generate widgets from prompts. Constrained to your catalog.
        </p>
      </header>

      <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want..."
            disabled={isStreaming}
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--foreground)",
              fontSize: 16,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={isStreaming || !prompt.trim()}
            style={{
              padding: "12px 24px",
              background: isStreaming ? "var(--border)" : "var(--foreground)",
              color: "var(--background)",
              border: "none",
              borderRadius: "var(--radius)",
              fontSize: 16,
              fontWeight: 500,
              opacity: isStreaming || !prompt.trim() ? 0.5 : 1,
            }}
          >
            {isStreaming ? "Generating..." : "Generate"}
          </button>
          {hasElements && (
            <>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setShowCodeExport(true);
                }}
                style={{
                  padding: "12px 16px",
                  background: "transparent",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 16,
                }}
              >
                Export Project
              </button>
              <button
                type="button"
                onClick={clear}
                style={{
                  padding: "12px 16px",
                  background: "transparent",
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 16,
                }}
              >
                Clear
              </button>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              style={{
                padding: "6px 12px",
                background: "var(--card)",
                color: "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 13,
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div
          style={{
            padding: 16,
            marginBottom: 24,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "#ef4444",
            fontSize: 14,
          }}
        >
          {error.message}
        </div>
      )}

      <div
        style={{
          minHeight: 300,
          padding: 24,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        {!hasElements && !isStreaming ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--muted)",
            }}
          >
            <p style={{ margin: 0 }}>Enter a prompt to generate a widget</p>
          </div>
        ) : tree ? (
          <Renderer
            tree={tree}
            registry={componentRegistry}
            loading={isStreaming}
          />
        ) : null}
      </div>

      {hasElements && (
        <details style={{ marginTop: 24 }}>
          <summary
            style={{ cursor: "pointer", fontSize: 14, color: "var(--muted)" }}
          >
            View JSON
          </summary>
          <pre
            style={{
              marginTop: 8,
              padding: 16,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "auto",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            {JSON.stringify(tree, null, 2)}
          </pre>
        </details>
      )}

      {/* Code Export Modal */}
      {showCodeExport && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setShowCodeExport(false)}
        >
          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              width: "90%",
              maxWidth: 1000,
              height: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                  Export Next.js Project
                </h2>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 13,
                    color: "var(--muted)",
                  }}
                >
                  {exportedFiles.length} files generated
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={downloadAllFiles}
                  style={{
                    padding: "8px 16px",
                    background: "var(--foreground)",
                    color: "var(--background)",
                    border: "none",
                    borderRadius: "var(--radius)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Download All
                </button>
                <button
                  onClick={() => setShowCodeExport(false)}
                  style={{
                    padding: "8px 16px",
                    background: "transparent",
                    color: "var(--muted)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* File List */}
              <div
                style={{
                  width: 240,
                  borderRight: "1px solid var(--border)",
                  overflow: "auto",
                  padding: "8px 0",
                }}
              >
                {exportedFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file.path)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "8px 16px",
                      background:
                        activeFile === file.path
                          ? "var(--border)"
                          : "transparent",
                      border: "none",
                      textAlign: "left",
                      fontSize: 13,
                      fontFamily: "monospace",
                      color:
                        activeFile === file.path
                          ? "var(--foreground)"
                          : "var(--muted)",
                      cursor: "pointer",
                    }}
                  >
                    {file.path}
                  </button>
                ))}
              </div>

              {/* File Content */}
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {activeFile && (
                  <>
                    <div
                      style={{
                        padding: "8px 16px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "var(--card)",
                      }}
                    >
                      <span style={{ fontSize: 13, fontFamily: "monospace" }}>
                        {activeFile}
                      </span>
                      <button
                        onClick={() =>
                          activeFileContent &&
                          copyFileContent(activeFileContent)
                        }
                        style={{
                          padding: "4px 12px",
                          background: "var(--border)",
                          color: "var(--foreground)",
                          border: "none",
                          borderRadius: "var(--radius)",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: 16,
                        overflow: "auto",
                        background: "var(--card)",
                      }}
                    >
                      <CodeHighlight
                        code={activeFileContent || ""}
                        language={getLanguageFromPath(activeFile)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DataProvider initialData={INITIAL_DATA}>
      <VisibilityProvider>
        <ActionProvider handlers={ACTION_HANDLERS}>
          <DashboardContent />
        </ActionProvider>
      </VisibilityProvider>
    </DataProvider>
  );
}
