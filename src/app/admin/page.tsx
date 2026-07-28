'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ConfirmDialog from '@/components/ConfirmDialog';
import PasswordField from '@/components/PasswordField';

type UserEntry = {
  id: string;
  email: string;
  role: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [mfaResettingId, setMfaResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [mfaSaving, setMfaSaving] = useState(false);
  const [pendingMfaReset, setPendingMfaReset] = useState<UserEntry | null>(null);

  useEffect(() => {
    const load = async () => {
      // Second layer of defense: confirm the caller is actually a CG.
      // Middleware only checks "logged in", not role, so this page must
      // check for itself and bounce anyone who isn't authorized.
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        router.replace('/login');
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .single();

      if (roleError || roleData?.role !== 'cg') {
        router.replace('/');
        return;
      }

      const { data, error } = await supabase.rpc('get_all_users');
      if (error) setError('Could not load users.');
      else setUsers(data as UserEntry[]);
      setCurrentUserId(userId);
      setReady(true);
    };

    load();
  }, [router]);

  const handleResetPassword = async (user: UserEntry) => {
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setError('Your session has expired. Please log in again.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: user.id, password: newPassword }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? 'Could not reset password.');
      } else {
        setSuccess(`Password reset successfully for ${user.email}.`);
        setResettingId(null);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError('Network error — could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetMfa = (user: UserEntry) => {
    setPendingMfaReset(user);
  };

  const confirmResetMfa = async () => {
    const user = pendingMfaReset;
    setPendingMfaReset(null);
    if (!user) return;

    setMfaResettingId(user.id);
    setMfaSaving(true);
    setError('');
    setSuccess('');

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setError('Your session has expired. Please log in again.');
      setMfaSaving(false);
      setMfaResettingId(null);
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? 'Could not reset 2FA.');
      } else {
        const count = Number(result.removed ?? 0);
        setSuccess(
          count > 0
            ? `2FA reset successfully for ${user.email}. They will set it up again on next login.`
            : `${user.email} had no 2FA factors to reset.`
        );
      }
    } catch {
      setError('Network error — could not reach the server.');
    } finally {
      setMfaSaving(false);
      setMfaResettingId(null);
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

      {error && <div className="banner banner--error">{error}</div>}

      {success && <div className="banner banner--success">{success}</div>}

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
                        <PasswordField
                          placeholder="New password"
                          value={newPassword}
                          onChange={setNewPassword}
                          autoComplete="new-password"
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
                        <PasswordField
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          autoComplete="new-password"
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
                          onClick={() => { setResettingId(null); setNewPassword(''); setConfirmPassword(''); setError(''); }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="table-action"
                          type="button"
                          onClick={() => { setResettingId(user.id); setNewPassword(''); setConfirmPassword(''); setSuccess(''); setError(''); }}
                        >
                          Reset Password
                        </button>
                        {/* Email 2FA is disabled for now. */}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingMfaReset)}
        title="Reset 2FA"
        message={`Reset 2FA for ${pendingMfaReset?.email}? They will need to set it up again on next login.`}
        confirmLabel="Reset 2FA"
        danger
        onConfirm={confirmResetMfa}
        onCancel={() => setPendingMfaReset(null)}
      />

    </main>
  );
}
