'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="landing-shell">
      <div className="panel accent-red" style={{ width: '100%', maxWidth: '420px', padding: '32px', textAlign: 'center' }}>
        <p className="eyebrow">Error</p>
        <h1 style={{ fontSize: '22px', marginTop: '4px', marginBottom: '12px' }}>Something went wrong</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          This page ran into an unexpected error. You can try again, or head back home.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button className="button button--secondary" type="button" onClick={() => { window.location.href = '/'; }}>
            Back to home
          </button>
          <button className="button button--primary" type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}