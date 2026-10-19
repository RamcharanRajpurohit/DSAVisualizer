import type { NextConfig } from "next";
import { ANALYTICS } from "./src/config/analytics";

// Old Rails routes → new routes, so existing links and search results keep working.
const legacyRoutes: Record<string, string> = {
  "/heap/index": "/heap",
  "/bst/index": "/bst",
  "/sorting/index": "/sorting",
  "/avl_tree/index": "/avl-tree",
  "/avl_tree": "/avl-tree",
  "/stack/index": "/stack-queue",
  "/stack": "/stack-queue",
  "/link_list/index": "/linked-list",
  "/link_list": "/linked-list",
  "/btree/index": "/btree",
  "/graph/index": "/graph",
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    rules: {
      // Tailwind processes global stylesheets only; CSS modules keep Turbopack's css-module handling.
      "*.css": {
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // PostHog's API paths end in "/" (e.g. /e/); without this Next would 308 them before the rewrite.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // First-party relay for analytics: assets first (more specific), then the event API.
    return [
      { source: `${ANALYTICS.apiPath}/static/:path*`, destination: `${ANALYTICS.assetHost}/static/:path*` },
      { source: `${ANALYTICS.apiPath}/array/:path*`, destination: `${ANALYTICS.assetHost}/array/:path*` },
      { source: `${ANALYTICS.apiPath}/:path*`, destination: `${ANALYTICS.apiHost}/:path*` },
    ];
  },
  async redirects() {
    return [
      ...Object.entries(legacyRoutes).map(([source, destination]) => ({ source, destination, permanent: true })),
      // skipTrailingSlashRedirect turned Next's own "/x/ → /x" off; keep it for pages (one URL per page).
      { source: `/:path((?!${ANALYTICS.apiPath.slice(1)}).+)/`, destination: "/:path", permanent: true },
    ];
  },
};

export default nextConfig;
