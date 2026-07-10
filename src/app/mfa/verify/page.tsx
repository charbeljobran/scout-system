'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MfaVerifyPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadFactor = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace('/login');
        return;
      }

      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel === 'aal2') {
        router.replace('/');
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp.find(item => item.status === 'verified');

      if (!factor) {
        router.replace('/mfa/setup');
        return;
      }

      setFactorId(factor.id);
      setLoading(false);
    };

    loadFactor();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    setVerifying(true);
    setError('');

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });

    setVerifying(false);

    if (verifyError) {
      setError('That code was not accepted. Try the newest code from your authenticator app.');
      return;
    }

    router.replace('/');
  };

  return (
    <main className="landing-shell">
      <section className="panel accent-red auth-panel">
        <div className="auth-panel__header">
          <img src="/sdlmwm-logo.jpg" alt="Scout Du Liban" width="64" height="64" />
          <h1>Enter 2FA Code</h1>
          <p>Use the current 6-digit code from your authenticator app.</p>
        </div>

        {loading ? (
          <p className="history-empty">Checking your account...</p>
        ) : (
          <form className="auth-form" onSubmit={verifyCode}>
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
            <button className="button button--secondary" type="button" onClick={signOut}>
              Sign Out
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
