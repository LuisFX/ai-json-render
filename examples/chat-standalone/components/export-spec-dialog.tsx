"use client";

import { useEffect, useId, useState } from "react";
import type { Spec } from "@json-render/core";

import { Button } from "@/components/ui/button";
import type { SpecVersion } from "@/lib/export-trace";
import { cn } from "@/lib/utils";

export type ExportSpecChoice =
  | { kind: "version"; version: number }
  | { kind: "frozen"; spec: Spec };

type ExportSpecDialogProps = {
  open: boolean;
  versions: SpecVersion[];
  frozenSpec?: Spec | null;
  onCancel: () => void;
  onConfirm: (choice: ExportSpecChoice) => void;
};

export function ExportSpecDialog({
  open,
  versions,
  frozenSpec,
  onCancel,
  onConfirm,
}: ExportSpecDialogProps) {
  const titleId = useId();
  const hasFrozen = frozenSpec != null;
  const defaultKey = hasFrozen
    ? "frozen"
    : versions.length > 0
      ? `v${versions[versions.length - 1]!.version}`
      : null;
  const [selected, setSelected] = useState<string | null>(defaultKey);

  useEffect(() => {
    if (!open) return;
    setSelected(
      hasFrozen
        ? "frozen"
        : versions.length > 0
          ? `v${versions[versions.length - 1]!.version}`
          : null,
    );
  }, [open, hasFrozen, versions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirm = () => {
    if (selected === "frozen" && frozenSpec) {
      onConfirm({ kind: "frozen", spec: frozenSpec });
      return;
    }
    if (selected?.startsWith("v")) {
      const version = Number(selected.slice(1));
      if (Number.isFinite(version)) {
        onConfirm({ kind: "version", version });
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Dismiss"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-lg"
      >
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Select Spec to export
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Specs are numbered in order of appearance in the conversation.
        </p>

        <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto">
          {hasFrozen && frozenSpec && (
            <li>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm",
                  selected === "frozen"
                    ? "border-primary bg-accent"
                    : "border-border hover:bg-accent/50",
                )}
              >
                <input
                  type="radio"
                  name="export-spec"
                  className="mt-1"
                  checked={selected === "frozen"}
                  onChange={() => setSelected("frozen")}
                />
                <span>
                  <span className="font-medium">
                    Active frozen Spec (Mode B)
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Current upload / paste freeze — not a transcript fold
                  </span>
                </span>
              </label>
            </li>
          )}
          {versions.map((v) => {
            const key = `v${v.version}`;
            return (
              <li key={v.messageId}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm",
                    selected === key
                      ? "border-primary bg-accent"
                      : "border-border hover:bg-accent/50",
                  )}
                >
                  <input
                    type="radio"
                    name="export-spec"
                    className="mt-1"
                    checked={selected === key}
                    onChange={() => setSelected(key)}
                  />
                  <span>
                    <span className="font-medium">v{v.version}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {v.preview}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={selected == null}>
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
