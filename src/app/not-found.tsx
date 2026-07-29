import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="landing-shell">
      <div className="panel accent-red" style={{ width: '100%', maxWidth: '420px', padding: '32px', textAlign: 'center' }}>
        <p className="eyebrow">404</p>
        <h1 style={{ fontSize: '22px', marginTop: '4px', marginBottom: '12px' }}>Page not found</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          That page doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
        <Link className="button button--primary" href="/">Back to home</Link>
      </div>
    </main>
  );
}