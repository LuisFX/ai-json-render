"use client";

import { useEffect, useState } from "react";
import { codeToHtml, type BundledLanguage } from "shiki";

const vercelDarkTheme = {
  name: "vercel-dark",
  type: "dark" as const,
  colors: {
    "editor.background": "transparent",
    "editor.foreground": "#EDEDED",
  },
  settings: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#666666" },
    },
    {
      scope: ["string", "string.quoted", "string.template"],
      settings: { foreground: "#50E3C2" },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language.boolean",
        "constant.language.null",
      ],
      settings: { foreground: "#50E3C2" },
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier"],
      settings: { foreground: "#FF0080" },
    },
    {
      scope: ["keyword.operator", "keyword.control"],
      settings: { foreground: "#FF0080" },
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call"],
      settings: { foreground: "#7928CA" },
    },
    {
      scope: ["variable", "variable.other", "variable.parameter"],
      settings: { foreground: "#EDEDED" },
    },
    {
      scope: ["entity.name.tag", "support.class.component", "entity.name.type"],
      settings: { foreground: "#FF0080" },
    },
    {
      scope: ["punctuation", "meta.brace", "meta.bracket"],
      settings: { foreground: "#888888" },
    },
    {
      scope: [
        "support.type.property-name",
        "entity.name.tag.json",
        "meta.object-literal.key",
      ],
      settings: { foreground: "#EDEDED" },
    },
    {
      scope: ["entity.other.attribute-name"],
      settings: { foreground: "#50E3C2" },
    },
    {
      scope: ["support.type.primitive", "entity.name.type.primitive"],
      settings: { foreground: "#50E3C2" },
    },
  ],
};

interface CodeHighlightProps {
  code: string;
  language?: BundledLanguage;
}

export function CodeHighlight({ code, language = "tsx" }: CodeHighlightProps) {
  const [html, setHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      setIsLoading(true);
      try {
        const result = await codeToHtml(code, {
          lang: language,
          theme: vercelDarkTheme,
        });
        if (!cancelled) {
          setHtml(result);
        }
      } catch {
        // Fallback to plain text on error
        if (!cancelled) {
          setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    highlight();

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  if (isLoading) {
    return (
      <pre
        style={{
          margin: 0,
          padding: 0,
          overflow: "auto",
          fontSize: 13,
          lineHeight: 1.6,
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          color: "#EDEDED",
        }}
      >
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      style={{
        overflow: "auto",
        fontSize: 13,
        lineHeight: 1.6,
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Get the appropriate language for a file extension
 */
export function getLanguageFromPath(path: string): BundledLanguage {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
      return "tsx";
    case "ts":
      return "typescript";
    case "jsx":
      return "jsx";
    case "js":
      return "javascript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "md":
      return "markdown";
    default:
      return "typescript";
  }
}
