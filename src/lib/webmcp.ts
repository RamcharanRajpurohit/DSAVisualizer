"use client";

import type { ModelContext, WebMcpToolAnnotations } from "@/types/webmcp";

/** A tool an AI agent can call on this page (WebMCP). Keep names snake_case and action-oriented. */
export interface AgentTool<A extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  /** What it does, when to use it, and what it returns — agents rely on this text. */
  description: string;
  /** JSON Schema (type: "object") for the arguments. */
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: readonly string[]; additionalProperties?: boolean };
  annotations?: WebMcpToolAnnotations;
  /** Return a short human-readable result (string) or a JSON-serialisable object. */
  execute: (args: A) => Promise<unknown> | unknown;
}

/** document.modelContext (current) or navigator.modelContext (older Chromium), if available. */
export function getModelContext(): ModelContext | null {
  if (typeof document === "undefined") return null;
  return document.modelContext ?? (typeof navigator !== "undefined" ? navigator.modelContext ?? null : null);
}

/** Register tools; returns a function that unregisters them all. Never throws. */
export function registerAgentTools(tools: readonly AgentTool[]): () => void {
  const ctx = getModelContext();
  if (!ctx) return () => {};
  const controller = new AbortController();
  for (const tool of tools) {
    try {
      const done = ctx.registerTool(
        {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema as Record<string, unknown>,
          annotations: tool.annotations,
          execute: async (args) => {
            try {
              const result = await tool.execute((args ?? {}) as Record<string, unknown>);
              return typeof result === "string" ? result : JSON.stringify(result);
            } catch (err) {
              return `Error: ${err instanceof Error ? err.message : String(err)}`;
            }
          },
        },
        { signal: controller.signal },
      );
      if (done && typeof (done as Promise<void>).catch === "function") (done as Promise<void>).catch(() => {});
    } catch {
      /* duplicate name / unsupported schema: skip this tool */
    }
  }
  return () => controller.abort();
}
