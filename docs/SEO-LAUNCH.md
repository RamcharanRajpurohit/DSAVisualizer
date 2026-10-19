# SEO launch checklist — algolab.rajpurohit.me

The code side is done (see "What the site already does" below). These steps need your accounts and are what
turns "a good site" into "an indexed site" quickly. Do them in this order on launch day.

## 1. Deploy (day 0)
1. Push the branch, import the repo in Vercel, add the domain `algolab.rajpurohit.me` (CNAME → `cname.vercel-dns.com`).
2. Production env vars (Vercel → Settings → Environment Variables), all optional:
   - `GOOGLE_SITE_VERIFICATION` — only if you verify with the HTML-tag method (step 2).
   - `BING_SITE_VERIFICATION` — only if Bing asks for the `msvalidate.01` tag.
   - `NEXT_PUBLIC_SITE_URL` — only if the domain ever changes (default is `https://algolab.rajpurohit.me`).
3. Open `https://algolab.rajpurohit.me/robots.txt`, `/sitemap.xml`, `/llms.txt` and `/.well-known/ai-catalog.json` to confirm they load.

## 2. Google (feeds Google Search, AI Overviews, AI Mode, Gemini, Chrome) — day 0
1. Google Search Console → Add property → **Domain** `rajpurohit.me` (DNS TXT record; covers every subdomain) —
   or URL-prefix `https://algolab.rajpurohit.me/` with the HTML tag (`GOOGLE_SITE_VERIFICATION`).
2. Sitemaps → submit `https://algolab.rajpurohit.me/sitemap.xml`.
3. URL Inspection → **Request indexing** for the home page and the most important pages first
   (`/sorting/merge-sort`, `/sorting/quick-sort`, `/graph/dijkstra`, `/avl-tree/rotations`, `/stack-queue/infix-to-postfix`, …).
   There is a daily quota (~10–12/day) — do the rest over the next days.
4. **Settings → Generative AI features → include this site.** Google's May-2026 guidance makes this the one hard
   eligibility gate for appearing in AI Overviews / AI Mode.
5. After ~3 days: Pages report (indexed vs. not), Core Web Vitals, Enhancements (Breadcrumbs, structured data).
   After ~2 weeks: Performance + the Generative AI performance report.

## 3. Bing (feeds Bing, ChatGPT search, Microsoft Copilot, DuckDuckGo, Yahoo) — day 0
1. Bing Webmaster Tools → **Import from Google Search Console** (one click once GSC is verified).
2. Submit the sitemap there too.
3. After every production deploy run `npm run indexnow` — it pushes every sitemap URL to IndexNow (Bing, Yandex,
   Seznam, Naver, Yep) so changes are picked up in minutes. The key file is already in `public/`.

## 4. Other AI assistants
- **Claude** cites via Brave Search; **Perplexity** uses its own crawler plus others. Both crawl on their own —
  robots.txt already welcomes ClaudeBot, Claude-SearchBot, PerplexityBot, GPTBot, OAI-SearchBot and friends.
  You can speed up Brave by searching your own pages in Brave once they are live (Brave's crawler discovers via its users).
- **Grok** leans on X: a post with the link and a short demo clip helps it (and real people) discover the site.

## 5. Links and mentions (the part no code can do) — week 1
Rankings for competitive terms come from other sites linking to you. Highest-value, legitimate ones:
- Link the site from the GitHub repo (About → Website) and the README (done in README).
- Write one genuinely useful post (dev.to / Hashnode / Medium / LinkedIn): e.g. "I rebuilt my DSA visualizer —
  merge sort's split tree and quick sort's partitions, step by step" with GIFs, linking to the exact pages.
- Share in places where people ask for this: r/learnprogramming, r/compsci, r/cscareerquestions (follow each sub's
  self-promotion rules), college / coding-club groups, LinkedIn.
- Submit to curated lists: awesome-algorithms / awesome-visualization style GitHub lists, Product Hunt, "There's an AI for that"-style
  tool directories where relevant.
- Never buy links or post spammy mentions — Google's guidance explicitly says inauthentic mentions don't help.

## Realistic timeline
- Days 1–7: discovered and indexed (faster with Search Console + IndexNow); brand searches ("AlgoLab DSA") and very
  specific long-tail queries can start showing.
- Weeks 2–8: long-tail pages ("merge sort visualizer step by step", "infix to postfix step by step", "AVL rotation
  visualizer") climb as Google gathers engagement data.
- Months 2–6: competitive head terms ("sorting visualizer", "DSA visualizer") depend mostly on links and engagement.
Nobody can guarantee position #1 in 5–6 days; what we control is being the best, most technically sound page for each query.

## What the site already does
- One focused URL per topic (≈40 pages): interactive visualizer on top, server-rendered article below
  (answer-first definition, steps, explanation, complexity, tested code, FAQ, related links).
- Unique `<title>`, meta description, canonical, Open Graph + Twitter card and 1200×630 share image per page.
- JSON-LD: WebSite + Person (author), and per page LearningResource/WebPage, WebApplication, BreadcrumbList, FAQPage.
- `robots.txt` open to search engines and AI crawlers; XML sitemap with lastmod; web app manifest; previews `noindex`.
- AI agents: `llms.txt`, `llms-full.txt`, Markdown copy of every page (`/md/...`), `/.well-known/ai-catalog.json`
  (Agentic Resource Discovery), `/agent-skills.md`, and WebMCP tools on every visualizer (Chrome's agentic browsing).
- Accessibility for agents: every control has an accessible name; single `<main>` landmark; skip link.
- Static pre-rendering on Vercel's CDN for fast loads (Core Web Vitals).
