import type { NextConfig } from "next";

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
  async redirects() {
    return Object.entries(legacyRoutes).map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
