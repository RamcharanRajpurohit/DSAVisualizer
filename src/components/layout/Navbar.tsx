"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { VISUALIZERS } from "@/config/visualizers";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";
import { VisualizerIcon } from "./VisualizerIcon";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <nav className="sticky top-0 z-50 h-[var(--navbar-h)] border-b border-line bg-black/75 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1800px] items-center gap-4 px-4">
        <Link href="/" className="shrink-0 text-lg font-extrabold tracking-wide text-fg" onClick={() => setOpen(false)}>
          DSA<span className="text-gradient">Visualizer</span>
        </Link>

        <div className="scroll-thin ml-auto hidden items-center gap-0.5 overflow-x-auto lg:flex">
          {VISUALIZERS.map((v) => {
            const active = pathname === v.href;
            return (
              <Link
                key={v.slug}
                href={v.href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                  active ? "bg-surface-3 text-fg" : "text-fg-dim hover:bg-surface-2 hover:text-fg",
                )}
              >
                <VisualizerIcon name={v.icon} size={14} className={active ? "text-brand" : "text-fg-faint"} />
                {v.short}
              </Link>
            );
          })}
        </div>

        <button
          onClick={() => setPalette(true)}
          className="ml-auto flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs text-fg-faint transition hover:border-line-strong hover:text-fg lg:ml-2"
          aria-label="Search visualizers"
        >
          <Search size={14} />
          <span className="hidden xl:inline">Search</span>
          <kbd className="hidden rounded border border-line-strong px-1 font-mono text-[10px] xl:inline">Ctrl K</kbd>
        </button>

        <button
          className="rounded-lg p-2 text-fg-dim hover:bg-surface-2 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle navigation"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-[var(--navbar-h)] grid grid-cols-2 gap-1 border-b border-line bg-black/95 p-3 backdrop-blur-xl lg:hidden">
          {VISUALIZERS.map((v) => (
            <Link
              key={v.slug}
              href={v.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm",
                pathname === v.href ? "bg-surface-3 text-fg" : "text-fg-dim hover:bg-surface-2",
              )}
            >
              <VisualizerIcon name={v.icon} size={16} className="text-brand" />
              {v.title}
            </Link>
          ))}
        </div>
      )}
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </nav>
  );
}
