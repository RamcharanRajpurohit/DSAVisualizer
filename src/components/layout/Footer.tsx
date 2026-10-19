import { SITE } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-line py-8 text-center text-sm text-fg-faint">
      {SITE.name} · An interactive platform for learning data structures &amp; algorithms ·{" "}
      <a href={SITE.repo} className="text-fg-dim underline-offset-4 hover:text-fg hover:underline" target="_blank" rel="noreferrer">
        Source on GitHub
      </a>
    </footer>
  );
}
