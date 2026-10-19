import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100dvh-var(--navbar-h))] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-mono text-sm text-viz-red">404 · node not found</p>
      <h1 className="text-3xl font-bold">This page fell out of the tree.</h1>
      <Link href="/" className="rounded-lg bg-surface-3 px-4 py-2 text-sm hover:bg-surface-2">Back to all visualizers</Link>
    </main>
  );
}
