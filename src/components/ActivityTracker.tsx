'use client';

// Activity tracking now happens entirely server-side in middleware.ts,
// which refreshes the httpOnly `last_activity` cookie on every request.
// This component is intentionally a no-op: client-side JS can no longer
// read or write that cookie (httpOnly), so there's nothing for it to do.
// Kept as a stub so existing imports in layout.tsx don't need to change.
export default function ActivityTracker() {
  return null;
}
