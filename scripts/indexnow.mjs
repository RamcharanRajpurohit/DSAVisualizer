#!/usr/bin/env node
/**
 * Push every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam, Naver, Yep) so new and
 * updated pages are indexed within minutes — Bing's index also feeds ChatGPT search and Copilot.
 * Run after each production deploy:  npm run indexnow
 */
const SITE = process.env.SITE_URL ?? "https://algolab.rajpurohit.me";
const KEY = "5f664437066cc52b11400ead5894b757";

const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urls.length) throw new Error("No URLs found in sitemap");

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} — submitted ${urls.length} URLs`);
