/**
 * Product analytics (PostHog, EU cloud, project "AlgoLab").
 * The project token is a public, write-only client key — safe to ship in the bundle.
 * Events go through our own domain (`apiPath`, rewritten in next.config.ts) so fewer are
 * lost to ad blockers; the path is deliberately not called "analytics"/"posthog".
 */
export const ANALYTICS = {
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "phc_tfjbsCcJ6T4Jr6mjJaGnLKGCUZo5rWR9kijAM9cKWTBE",
  apiPath: "/relay-a7",
  apiHost: "https://eu.i.posthog.com",
  assetHost: "https://eu-assets.i.posthog.com",
  uiHost: "https://eu.posthog.com",
  /** Only the production domain reports; previews and local dev stay silent (see analytics.ts). */
  productionHost: "algolab.rajpurohit.me",
} as const;
