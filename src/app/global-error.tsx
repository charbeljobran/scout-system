'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', maxWidth: '360px' }}>
            <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>Something went wrong</h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
              The app hit an unexpected error. Please try again.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--color-brand)', color: 'var(--color-surface)', fontWeight: 700, cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}