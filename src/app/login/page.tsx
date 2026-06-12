'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    router.push('/');
  };

  return (
    <main className="landing-shell">
      <div className="panel accent-red" style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/sdlmwm-logo.jpg" alt="Scout Du Liban" width="64" height="64" style={{ marginBottom: '12px' }} />
          <h1 style={{ fontSize: '22px', marginBottom: '4px' }}>Scout Inventory</h1>
          <p style={{ fontSize: '13px', color: '#76716c' }}>Sign in to access the inventory</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '700' }}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{ padding: '9px 12px', border: '1px solid #d8d1ca', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#f5f3f0' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '700' }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{ padding: '9px 12px', border: '1px solid #d8d1ca', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#f5f3f0' }}
            />
          </label>

          {error && (
            <p style={{ color: '#cc2222', fontSize: '13px', fontWeight: '600' }}>{error}</p>
          )}

          <button
            className="button button--primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </div>
    </main>
  );
}