import type { ReactNode } from "react";

export type CodeLang = "python" | "cpp" | "java" | "javascript";

const KEYWORDS: Record<CodeLang, ReadonlySet<string>> = {
  python: new Set("def return if elif else for while in not and or class pass break continue import from as with lambda yield None True False self is del global nonlocal try except finally raise".split(" ")),
  cpp: new Set("int long double float char bool void auto const constexpr return if else for while do switch case break continue class struct public private protected new delete nullptr true false using namespace std template typename vector include static unsigned size_t this operator".split(" ")),
  java: new Set("int long double float char boolean void return if else for while do switch case break continue class interface public private protected static final new null true false this extends implements import package var".split(" ")),
  javascript: new Set("function return if else for while do switch case break continue class new null undefined true false this const let var of in typeof instanceof export import from extends static".split(" ")),
};

const COMMENT: Record<CodeLang, string> = { python: "#", cpp: "//", java: "//", javascript: "//" };

/** Very small, dependency-free highlighter: comments, strings, numbers, keywords, calls. */
export function highlightLine(line: string, lang: CodeLang): ReactNode[] {
  const out: ReactNode[] = [];
  const marker = COMMENT[lang];
  const re = new RegExp(
    `(${escape(marker)}.*$)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_]\\w*)(?=\\s*\\()|([A-Za-z_]\\w*)|(#include\\b|#define\\b)`,
    "g",
  );
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const [tok, comment, str, num, call, word, directive] = m;
    let cls = "";
    if (comment) cls = "text-fg-faint italic";
    else if (str) cls = "text-[#15803d]";
    else if (num) cls = "text-[#b45309]";
    else if (directive) cls = "text-[#be185d]";
    else if (call) cls = KEYWORDS[lang].has(call) ? "text-[#6d28d9]" : "text-[#1d4ed8]";
    else if (word) cls = KEYWORDS[lang].has(word) ? "text-[#6d28d9]" : "";
    out.push(cls ? <span key={k++} className={cls}>{tok}</span> : tok);
    last = m.index + tok.length;
    if (comment) break;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}
