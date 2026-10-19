"use client";

import { useEffect, useRef } from "react";
import { registerAgentTools, type AgentTool } from "@/lib/webmcp";

/**
 * Expose a page's tools to AI agents via WebMCP while the component is mounted.
 * Tools are registered once per set of names; `execute` always calls the latest closure,
 * so tools can read current React state without re-registering.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAgentTools(tools: readonly AgentTool<any>[]) {
  const latest = useRef(tools);
  useEffect(() => {
    latest.current = tools;
  });
  const names = tools.map((t) => t.name).join("|");

  useEffect(() => {
    const proxies: AgentTool[] = latest.current.map((t) => ({
      ...t,
      execute: (args) => {
        const current = latest.current.find((x) => x.name === t.name) ?? t;
        return current.execute(args);
      },
    }));
    return registerAgentTools(proxies);
    // Re-register only when the set of tool names changes.
  }, [names]);
}
