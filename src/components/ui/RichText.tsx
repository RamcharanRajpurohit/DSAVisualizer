import { Fragment, type ReactNode } from "react";

/**
 * Tiny, safe formatter for step explanations: **bold**, *italic*, `code` and newlines.
 * (No HTML is ever injected.)
 */
export function RichText({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <>
      {text.split("\n").map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {renderInline(line)}
        </Fragment>
      ))}
    </>
  );
}

function renderInline(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Bold may contain single asterisks (e.g. "**3 4 * +**"); it ends at the next "**".
  // *Italic* needs non-space just inside the stars, so "2 * 3 * 4" is left alone.
  const re = /(\*\*.+?\*\*|`[^`]+`|\*(?=[^\s*])[^*]*?[^\s*]\*|\*[^\s*]\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const tok = m[0];
    out.push(
      tok.startsWith("**") ? (
        <strong key={m.index} className="font-semibold text-fg">{tok.slice(2, -2)}</strong>
      ) : tok.startsWith("`") ? (
        <code key={m.index} className="rounded bg-surface-3 px-1 py-px font-mono text-[0.85em] text-viz-amber">{tok.slice(1, -1)}</code>
      ) : (
        <em key={m.index} className="italic text-fg">{tok.slice(1, -1)}</em>
      ),
    );
    last = m.index + tok.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}
