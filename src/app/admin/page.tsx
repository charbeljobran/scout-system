'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type UserEntry = {
  id: string;
  email: string;
  role: string;
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.rpc('get_all_users').then(({ data, error }) => {
      if (error) setError('Could not load users.');
      else setUsers(data as UserEntry[]);
      setReady(true);
    });
  }, []);

  const handleResetPassword = async (user: UserEntry) => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { data: userData } = await supabase.auth.getUser();
    const requesterId = userData.user?.id;

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, password: newPassword, requesterId }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? 'Could not reset password.');
      } else {
        setSuccess(`Password reset successfully for ${user.email}.`);
        setResettingId(null);
        setNewPassword('');
      }
    } catch {
      setError('Network error — could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return (
    <main className="page-shell">
      <p style={{ textAlign: 'center', color: '#888', padding: '40px' }}>Loading...</p>
    </main>
  );

  return (
    <main className="page-shell">

      <div style={{ marginBottom: '24px' }}>
        <p className="eyebrow">Admin</p>
        <h1 style={{ fontSize: '24px', fontWeight: '800', marginTop: '4px' }}>User Management</h1>
      </div>

      {error && (
        <div style={{ background: '#fde8e8', border: '1px solid #f0c0c0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
          <p style={{ color: '#8b1a1a', fontSize: '13px', fontWeight: '600' }}>{error}</p>
        </div>
      )}

      {success && (
        <div style={{ background: '#d4edda', border: '1px solid #b8ddc4', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
          <p style={{ color: '#1a5c2a', fontSize: '13px', fontWeight: '600' }}>{success}</p>
        </div>
      )}

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e8e3de', borderTop: '4px solid #cc2222', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: '#cc2222' }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#ffffff', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#ffffff', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '40px', color: '#76716c', fontStyle: 'italic' }}>
                    No users found.
                  </td>
                </tr>
              ) : users.map((user, index) => (
                <tr key={user.id} style={{ borderTop: index === 0 ? 'none' : '1px solid #f0ece8' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1a1a1a' }}>{user.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {resettingId === user.id ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="password"
                          placeholder="New password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleResetPassword(user); }}
                          style={{
                            padding: '5px 10px',
                            border: '1px solid #d8d1ca',
                            borderRadius: '6px',
                            fontSize: '13px',
                            width: '160px',
                            background: '#f5f3f0',
                            outline: 'none',
                          }}
                        />
                        <button
                          className="table-action"
                          type="button"
                          disabled={saving}
                          onClick={() => handleResetPassword(user)}
                        >
                          {saving ? 'Saving...' : 'Confirm'}
                        </button>
                        <button
                          className="table-action table-action--muted"
                          type="button"
                          onClick={() => { setResettingId(null); setNewPassword(''); setError(''); }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="table-action"
                        type="button"
                        onClick={() => { setResettingId(user.id); setNewPassword(''); setSuccess(''); setError(''); }}
                      >
                        Reset Password
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </main>
  );
}