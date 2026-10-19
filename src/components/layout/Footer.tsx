import Link from "next/link";
import { SITE } from "@/config/site";
import { VISUALIZERS } from "@/config/visualizers";
import { childTopics } from "@/content/registry";

/** Site footer: a full topic directory (good for visitors and for crawlers) plus credits. */
export function Footer() {
  return (
    <footer className="border-t border-line bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {VISUALIZERS.map((v) => (
          <nav key={v.slug} aria-label={v.title}>
            <Link href={v.href} className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim hover:text-fg">
              {v.short}
            </Link>
            <ul className="mt-2 space-y-1 text-sm">
              {childTopics(v.href).map((t) => (
                <li key={t.path}>
                  <Link href={t.path} className="text-fg-faint hover:text-fg">{t.name}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line py-6 text-center text-sm text-fg-faint">
        <span className="font-serif text-base text-fg">{SITE.name}</span> · {SITE.alternateName} · free and open source ·{" "}
        <Link href="/about" className="hover:text-fg hover:underline">About</Link> ·{" "}
        <a href={SITE.repo} className="hover:text-fg hover:underline" target="_blank" rel="noreferrer">GitHub</a> ·{" "}
        <a href="/llms.txt" className="hover:text-fg hover:underline">llms.txt</a>
      </div>
    </footer>
  );
}
