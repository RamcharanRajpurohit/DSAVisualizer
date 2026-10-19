import { SITE } from "@/config/site";

export const dynamic = "force-static";

/**
 * Open to everyone: search engines and the AI crawlers behind ChatGPT, Claude, Gemini,
 * Perplexity, Copilot and others are explicitly welcome, so the site can be cited in AI answers.
 * (The ARD catalog is discovered via /.well-known/ai-catalog.json and <link rel="ai-catalog">;
 * an `Agentmap:` line is not a valid robots.txt directive and fails robots validators.)
 */
const AI_AGENTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "GoogleOther",
  "Applebot", "Applebot-Extended",
  "Bingbot", "DuckAssistBot", "Amazonbot", "Meta-ExternalAgent", "MistralAI-User", "CCBot",
];

export function GET() {
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    ...AI_AGENTS.map((a) => `User-agent: ${a}`),
    "Allow: /",
    "",
    `Sitemap: ${SITE.url}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
