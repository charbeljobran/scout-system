'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Enrollment = {
  factorId: string;
  challengeId: string;
  qrCode: string;
  secret: string;
};

export default function MfaSetupPage() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const startEnrollment = async () => {
      setLoading(true);
      setError('');

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace('/login');
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp.some(factor => factor.status === 'verified')) {
        router.replace('/mfa/verify');
        return;
      }

      const { data: factor, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator ${new Date().toISOString()}`,
        issuer: 'Scout Inventory',
      });

      if (enrollError || !factor) {
        setError(enrollError?.message ?? 'Could not start two-factor setup.');
        setLoading(false);
        return;
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });

      if (challengeError || !challenge) {
        setError(challengeError?.message ?? 'Could not prepare verification.');
        setLoading(false);
        return;
      }

      setEnrollment({
        factorId: factor.id,
        challengeId: challenge.id,
        qrCode: factor.totp.qr_code,
        secret: factor.totp.secret,
      });
      setLoading(false);
    };

    startEnrollment();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const verifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;

    setVerifying(true);
    setError('');

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrollment.factorId,
      challengeId: enrollment.challengeId,
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
          <h1>Set Up 2FA</h1>
          <p>Scan the QR code with an authenticator app, then enter the 6-digit code.</p>
        </div>

        {loading ? (
          <p className="history-empty">Preparing your authenticator setup...</p>
        ) : enrollment ? (
          <form className="auth-form" onSubmit={verifyEnrollment}>
            <img
              className="mfa-qr"
              src={`data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.qrCode)}`}
              alt="Authenticator QR code"
            />
            <label>
              Manual setup key
              <input type="text" value={enrollment.secret} readOnly />
            </label>
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
            <button className="button button--secondary" type="button" onClick={signOut}>
              Sign Out
            </button>
          </form>
        ) : (
          <>
            {error && <p className="form-error">{error}</p>}
            <button className="button button--secondary" type="button" onClick={signOut}>
              Sign Out
            </button>
          </>
        )}
      </section>
    </main>
  );
}
