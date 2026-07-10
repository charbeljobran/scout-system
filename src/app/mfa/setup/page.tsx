'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MfaSetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [debugCode, setDebugCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  };

  const signOut = async () => {
    await fetch('/api/mfa/session', { method: 'DELETE' });
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setDebugCode('');

    const accessToken = await getAccessToken();

    if (!accessToken) {
      router.replace('/login');
      return;
    }

    try {
      const res = await fetch('/api/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? 'Could not send a 2FA code.');
      } else {
        setMaskedEmail(result.email ?? email);
        setDebugCode(result.debugCode ?? '');
      }
    } catch {
      setError('Network error - could not send a 2FA code.');
    } finally {
      setSending(false);
    }
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
        body: JSON.stringify({ code, purpose: 'setup' }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? 'That code was not accepted. Try the newest email code.');
      } else {
        router.replace('/');
        router.refresh();
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
          <h1>Set Up 2FA</h1>
          <p>Enter the email address that should receive your one-time security codes.</p>
        </div>

        {!maskedEmail ? (
          <form className="auth-form" onSubmit={sendCode}>
            <label>
              2FA email address
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="security@email.com"
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="button button--primary" type="submit" disabled={sending}>
              {sending ? 'Sending...' : 'Send Code'}
            </button>
            <button className="button button--secondary" type="button" onClick={signOut}>
              Sign Out
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={verifyCode}>
            <p className="history-empty">We sent a 6-digit code to {maskedEmail}. Enter it below to finish setup.</p>
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
              {verifying ? 'Verifying...' : 'Finish Setup'}
            </button>
            <button className="button button--secondary" type="button" onClick={() => setMaskedEmail('')}>
              Use Another Email
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
