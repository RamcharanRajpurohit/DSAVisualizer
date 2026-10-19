# DSA Visualizer

Interactive, step-by-step visualizations of data structures and algorithms — built with **Next.js**, deployable to **Vercel** with zero configuration.

Every visualizer records the algorithm as a list of snapshots, so you can **play, pause, step backwards, scrub and change speed**, while the **pseudocode line that is executing lights up**, the **variables** update in a watch panel, and every step **explains why** the algorithm did what it did.

| Visualizer | Highlights |
| --- | --- |
| **Sorting** (`/sorting`) | Bubble, selection, insertion, shell, counting, radix (LSD) · **merge sort split/merge tree** with call stack and stable-tie tags · **quick sort** with Lomuto or Hoare partitioning, 5 pivot rules, live `i`/`j` pointers and the recursion tree · live comparison / swap / write counters |
| **Stack & Queue** (`/stack-queue`) | Array stack (overflow / underflow), linear queue (the "wasted space" problem), circular queue drawn as a ring (count vs. one-slot-gap), deque · applications: bracket matching, infix → postfix (shunting-yard with precedence table), postfix evaluation, next greater element |
| **Linked List** (`/linked-list`) | Singly / doubly / circular, optional tail pointer · insert & delete at head / tail / index / value, search, in-place reversal, middle (slow/fast), Floyd cycle detection, remove duplicates, merge two sorted lists, and a "wrong pointer order" bug demo — every pointer write animated in order |
| **Heap** (`/heap`) | Min/max heap shown as tree **and** array with index arithmetic · insert, extract, peek, delete at index, update key · Floyd build-heap with the O(n) argument · in-place heap sort |
| **BST** (`/bst`) | Search walk, insert, all three delete cases, pre/in/post/level-order traversals with recursion, balanced / skewed / zig-zag presets, step mode |
| **AVL Tree** (`/avl-tree`) | Live heights & balance factors · LL / RR / LR / RL rotations played out phase by phase · one-click rotation demos · rotation counter |
| **B-Tree** (`/btree`) | Order 3–7 · keys keep their identity: medians rise on split, separators drop on merge, borrow through the parent · predecessor / successor / smart delete · live invariant checks · step mode |
| **Graphs** (`/graph`) | Build or generate graphs · BFS, DFS, Dijkstra, Bellman-Ford, Kruskal, Prim, topological sort (Kahn), SCC (Kosaraju) · adjacency matrix/list synced to each step · inline weight editor |

### Same input everywhere

Every page uses one input box (`ValueInput`) with the same rules, so there is nothing new to learn per page:

- Whole numbers **0–999**; random and preset data use **1–99** so nodes and bars stay compact.
- **Enter** runs the main action, the 🎲 button fills random values, and `5, 12, 8` applies a whole sequence.
- An **empty box is never a dead end**: insert/push adds a random value, search/delete picks a random existing one.
- Every page opens with an example already built, and presets are one click away.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4 (design tokens in `src/app/globals.css`) + CSS modules for layout
- [`motion`](https://motion.dev) for SVG/HTML animation, [`konva`](https://konvajs.org) for the canvas engines (graph, trees)
- `lucide-react` icons

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run build      # production build
```

Node.js ≥ 20.9 is required.

## Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project**, import the repository. The framework preset is detected as **Next.js** — no settings to change.
3. (Optional) set `NEXT_PUBLIC_SITE_URL` to your production URL so the sitemap, canonical URLs and Open Graph tags use it.
4. Deploy. Every page is statically pre-rendered, so it runs entirely on Vercel's free tier with no server time limits.

Old Rails URLs (`/sorting/index`, `/avl_tree/index`, `/link_list/index`, `/stack/index`, …) permanently redirect to the new routes (see `next.config.ts`).

## SEO and AI agents

Live at **https://algolab.rajpurohit.me** (canonical; previews are `noindex`). The launch steps that need your
Google/Bing accounts are in [`docs/SEO-LAUNCH.md`](docs/SEO-LAUNCH.md).

- **One focused page per topic** (`/sorting/merge-sort`, `/graph/dijkstra`, `/stack-queue/infix-to-postfix`, …): the
  interactive visualizer on top, a server-rendered article below (definition, steps, explanation, complexity, tested
  code, FAQ, related links). Content lives in `src/content/topics/*.ts` and drives everything below.
- **Metadata & structured data:** unique title/description/canonical/OG image per page; JSON-LD WebSite, Person,
  LearningResource, WebApplication, BreadcrumbList and FAQPage (`src/lib/seo.ts`).
- **Crawling:** `robots.txt` (open to search engines and AI crawlers, with `Agentmap`), `sitemap.xml`, web manifest,
  IndexNow (`npm run indexnow` after each deploy).
- **AI agents:** `llms.txt`, `llms-full.txt`, Markdown copies at `/md/<path>`, `/.well-known/ai-catalog.json`
  (Agentic Resource Discovery), `/agent-skills.md`, and WebMCP tools registered on every visualizer via
  `useAgentTools` (Chrome's agentic browsing; checked by Lighthouse's "Agentic Browsing" category).

## Project structure

```
src/
├─ app/                       # routes only: one thin page.tsx per visualizer + metadata, sitemap, robots, OG image
├─ config/                    # site info + the visualizer registry (drives home page, navbar, sitemap, metadata)
├─ content/                   # SEO content: one TopicContent per page (articles, FAQs, llms.txt, sitemap)
├─ components/
│  ├─ ui/                     # Button, Input, Select, Toggle, Segmented, Section, Badge, RichText…
│  ├─ visualizer/             # VisualizerLayout, PlaybackControls, PseudocodePanel, StatusCard,
│  │                          # VariablesPanel, Legend, ComplexityCard, CanvasHint
│  ├─ layout/                 # Navbar, Footer, icons
│  ├─ seo/                    # TopicArticle (server-rendered article + JSON-LD), JsonLd
│  ├─ agents/                 # site-wide WebMCP tools
│  └─ home/                   # landing page pieces
├─ lib/
│  ├─ player/                 # useStepPlayer (play/pause/step/scrub/speed + keyboard) and step types
│  ├─ hooks/                  # useElementSize
│  ├─ theme.ts                # shared visualizer palette (mirrors the CSS tokens)
│  └─ utils.ts
└─ features/                  # one self-contained module per visualizer
   ├─ sorting/                #   types.ts contract · basic/ (simple + non-comparison sorts) · dc/ (merge, quick)
   ├─ stack-queue/
   ├─ linked-list/
   ├─ heap/
   ├─ bst/                    #   BST + AVL share one engine (AVL extends BST)
   ├─ btree/
   └─ graph/
legacy-rails/                 # the original Ruby on Rails app, kept for reference (ignored by Vercel)
```

## How a visualizer works

```
input ──► algorithm recorder (pure TS) ──► Step[] ──► useStepPlayer ──► renderer (SVG / Konva) + insight panels
```

1. **Record** — the algorithm runs once on the input and pushes a full snapshot after every meaningful action:
   `{ title, detail, tone, line, vars, …state }`. Recorders are plain TypeScript with no React, so they are easy to test.
2. **Play** — `useStepPlayer(steps)` owns the current index, play/pause, speed and keyboard shortcuts
   (`←` `→` step, `Space` play/pause, `Home` / `End`).
3. **Render** — a renderer draws one step. Elements are keyed by identity, so moving from one snapshot to the next
   animates every element to its new place — forwards *and* backwards.
4. **Explain** — `StatusCard`, `PseudocodePanel` (highlighting `step.line`), `VariablesPanel` (`step.vars`), `Legend`
   and `ComplexityCard` sit around the canvas inside `VisualizerLayout`.

The tree and graph pages use imperative Konva engines (ported from the original app) wrapped in React components; they
expose the same playback / pseudocode / status hooks so the UI is identical everywhere.

Pure recorders and models are fuzz-tested against reference implementations (random operation sequences plus edge
cases such as empty input, one element, duplicates, sorted and reversed data).

### Adding a new visualizer

1. Add an entry to `src/config/visualizers.ts`.
2. Create `src/features/<name>/` with a recorder, a renderer and a `<Name>Visualizer.tsx` that composes `VisualizerLayout`.
3. Add `src/app/<slug>/page.tsx` that exports `visualizerMetadata("<slug>")` and renders the component.

## Legacy Rails app

The original Ruby on Rails version lives in `legacy-rails/`. It is excluded from TypeScript, ESLint and Vercel deployments
and can be deleted once you no longer need it for reference.
