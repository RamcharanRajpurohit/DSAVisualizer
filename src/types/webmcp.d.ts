/**
 * WebMCP (W3C Web Machine Learning CG draft; Chrome early preview / origin trial).
 * https://developer.chrome.com/docs/ai/webmcp/imperative-api
 */
export interface WebMcpToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  consequentialHint?: boolean;
}

export interface WebMcpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: WebMcpToolAnnotations;
  execute: (args: Record<string, unknown>, context?: { signal?: AbortSignal }) => Promise<unknown> | unknown;
}

export interface ModelContext {
  registerTool(tool: WebMcpToolDefinition, options?: { signal?: AbortSignal }): Promise<void> | void;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
  interface Navigator {
    /** Older name (deprecated in newer Chromium); feature-detected as a fallback. */
    modelContext?: ModelContext;
  }
}
