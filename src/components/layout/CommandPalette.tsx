"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { VISUALIZERS } from "@/config/visualizers";
import { cn } from "@/lib/utils";
import { VisualizerIcon } from "./VisualizerIcon";

/** Extra search words so "dijkstra" finds Graphs, "rotation" finds AVL, … */
const ALIASES: Record<string, string> = {
  sorting: "bubble selection insertion shell merge quick counting radix partition pivot",
  "stack-queue": "lifo fifo circular ring deque brackets parentheses infix postfix shunting yard evaluation",
  "linked-list": "pointer node reverse floyd cycle slow fast middle doubly circular merge",
  heap: "priority queue sift heapify build heap sort min max",
  bst: "binary search tree traversal inorder preorder postorder level order delete successor",
  "avl-tree": "balance rotation ll rr lr rl self-balancing height",
  btree: "b-tree multiway split merge borrow order database",
  graph: "bfs dfs dijkstra bellman ford kruskal prim mst topological scc kosaraju shortest path",
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return VISUALIZERS;
    return VISUALIZERS.filter((v) => `${v.title} ${v.short} ${v.description} ${ALIASES[v.slug] ?? ""}`.toLowerCase().includes(t));
  }, [q]);

  if (!open) return null;
  const go = (href: string) => {
    onClose();
    setQ("");
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-[#1a1a1a]/25 p-4 pt-[12vh] backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Jump to a visualizer"
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search size={16} className="text-fg-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              else if (e.key === "Enter" && results[sel]) go(results[sel].href);
              else if (e.key === "Escape") onClose();
            }}
            placeholder="Search: dijkstra, rotation, heap sort…"
            className="h-12 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none"
          />
        </div>
        <ul className="scroll-thin max-h-[50vh] overflow-y-auto p-2">
          {results.map((v, i) => (
            <li key={v.slug}>
              <button
                onMouseEnter={() => setSel(i)}
                onClick={() => go(v.href)}
                className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left", i === sel ? "bg-surface-3" : "hover:bg-surface-2")}
              >
                <VisualizerIcon name={v.icon} size={18} className="shrink-0 text-fg-dim" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">{v.title}</span>
                  <span className="block truncate text-xs text-fg-faint">{v.topics.join(" · ")}</span>
                </span>
                {i === sel && <CornerDownLeft size={14} className="text-fg-faint" />}
              </button>
            </li>
          ))}
          {!results.length && <li className="px-3 py-6 text-center text-sm text-fg-faint">Nothing matches “{q}”.</li>}
        </ul>
      </div>
    </div>
  );
}
