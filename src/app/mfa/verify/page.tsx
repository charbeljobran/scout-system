'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MfaVerifyPage() {
  const router = useRouter();
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [debugCode, setDebugCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  };

  const sendCode = async () => {
    setSending(true);
    setError('');
    setDebugCode('');

    const accessToken = await getAccessToken();

    if (!accessToken) {
      router.replace('/login');
      return;
    }

    try {
      const res = await fetch('/api/mfa/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await res.json();

      if (!res.ok) {
        if (res.status === 400) router.replace('/mfa/setup');
        else setError(result.error ?? 'Could not send a 2FA code.');
      } else {
        setMaskedEmail(result.email ?? '');
        setDebugCode(result.debugCode ?? '');
      }
    } catch {
      setError('Network error - could not send a 2FA code.');
    } finally {
      setSending(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await fetch('/api/mfa/session', { method: 'DELETE' });
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError('');

    const accessToken = await getAccessToken();

    if (!accessToken) {
      router.replace('/login');
      return;
    }

    try {
      const res = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ code, purpose: 'login' }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? 'That code was not accepted. Try the newest email code.');
      } else {
        router.replace('/');
      }
    } catch {
      setError('Network error - could not verify the code.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="landing-shell">
      <section className="panel accent-red auth-panel">
        <div className="auth-panel__header">
          <img src="/sdlmwm-logo.jpg" alt="Scout Du Liban" width="64" height="64" />
          <h1>Enter 2FA Code</h1>
          <p>Check your 2FA email address for the 6-digit code.</p>
        </div>

        {loading ? (
          <p className="history-empty">Sending your security code...</p>
        ) : (
          <form className="auth-form" onSubmit={verifyCode}>
            {maskedEmail && <p className="history-empty">We sent a code to {maskedEmail}.</p>}
            {debugCode && <p className="history-empty">Local test code: {debugCode}</p>}
            <label>
              6-digit code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="button button--primary" type="submit" disabled={verifying || code.length !== 6}>
              {verifying ? 'Verifying...' : 'Verify'}
            </button>
            <button className="button button--secondary" type="button" disabled={sending} onClick={sendCode}>
              {sending ? 'Sending...' : 'Resend Code'}
            </button>
            <button className="button button--secondary" type="button" onClick={signOut}>
              Sign Out
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

