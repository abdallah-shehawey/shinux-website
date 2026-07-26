"use client";

import { usePendingNavigation } from "./NavigationPending";
import { skeletonForPath } from "./route-skeletons";

/**
 * Swaps the page for the destination's loading skeleton while a navigation is
 * in flight, instead of leaving the page you're leaving frozen on screen.
 *
 * The skeleton rendered here is literally the destination's own `loading.tsx`
 * component, so what paints on click is byte-for-byte what Next.js streams in
 * a moment later — the handover is invisible. See NavigationPendingProvider
 * for why the App Router can't do this itself, and route-skeletons for how a
 * URL is resolved to its skeleton.
 */
export default function NavigationSkeleton({ children }: { children: React.ReactNode }) {
  const pending = usePendingNavigation();

  const skeleton = pending === null ? null : skeletonForPath(pending);

  return <>{skeleton ?? children}</>;
}
