"use client";

import { type ReactNode } from "react";
import {
  Renderer,
  type ComponentRenderer,
  type Spec,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
} from "@json-render/react";
import type { StateStore } from "@json-render/core";

import { registry, Fallback } from "./registry";

// =============================================================================
// ExplorerRenderer
// =============================================================================

interface ExplorerRendererProps {
  spec: Spec | null;
  loading?: boolean;
  /**
   * Controlled store (Mode B / harness). When set, `spec.state` seed is ignored
   * and `StateProvider` uses this store as the single source of truth.
   */
  store?: StateStore;
  /**
   * Remounts StateProvider when the viewed Spec version changes so patched
   * `/state` from a previous version is not mixed into the next one.
   * `StateProvider` still syncs when `initialState` gets a new object identity
   * (streaming patches on the same version).
   */
  stateKey?: string;
}

const fallback: ComponentRenderer = ({ element }) => (
  <Fallback type={element.type} />
);

export function ExplorerRenderer({
  spec,
  loading,
  store,
  stateKey,
}: ExplorerRendererProps): ReactNode {
  if (!spec) return null;

  return (
    <StateProvider
      key={store ? "store" : (stateKey ?? spec.root)}
      store={store}
      initialState={store ? undefined : (spec.state ?? {})}
    >
      <VisibilityProvider>
        <ActionProvider>
          <Renderer
            spec={spec}
            registry={registry}
            fallback={fallback}
            loading={loading}
          />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
