'use client';

// ActivityTracker no longer sets last_activity directly.
// The cookie is now set server-side (httpOnly) in middleware.ts on every
// request, so it cannot be tampered with by JavaScript.
// This component is kept as a no-op in case you want to add
// client-side idle detection in the future.

export default function ActivityTracker() {
  return null;
}
