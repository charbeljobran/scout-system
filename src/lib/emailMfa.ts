import { createHash, randomBytes, randomInt } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const EMAIL_MFA_COOKIE = 'email_mfa_session';
export const EMAIL_MFA_CODE_TTL_MINUTES = 10;
export const EMAIL_MFA_SESSION_TTL_SECONDS = 12 * 60 * 60;

type ChallengePurpose = 'setup' | 'login';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const getSecret = () =>
  process.env.EMAIL_MFA_SECRET ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'local-email-mfa-secret';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  const maskedName = name.length <= 2 ? `${name[0] ?? ''}*` : `${name.slice(0, 2)}***${name.slice(-1)}`;
  return `${maskedName}@${domain}`;
};

export const hashCode = (userId: string, code: string) =>
  createHash('sha256').update(`${userId}:${code}:${getSecret()}`).digest('hex');

export const hashToken = (token: string) =>
  createHash('sha256').update(`${token}:${getSecret()}`).digest('hex');

export const generateCode = () => String(randomInt(100000, 1000000));

export const generateSessionToken = () => randomBytes(32).toString('base64url');

export async function createEmailChallenge(userId: string, email: string, purpose: ChallengePurpose) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + EMAIL_MFA_CODE_TTL_MINUTES * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  await supabaseAdmin
    .from('user_mfa_email_challenges')
    .update({ consumed_at: now })
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .is('consumed_at', null);

  const { error } = await supabaseAdmin.from('user_mfa_email_challenges').insert({
    user_id: userId,
    email,
    purpose,
    code_hash: hashCode(userId, code),
    expires_at: expiresAt,
  });

  if (error) throw new Error(error.message);

  await sendEmailCode(email, code);

  return code;
}

export async function sendEmailCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MFA_EMAIL_FROM ?? 'Scout Inventory <onboarding@resend.dev>';

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY is not configured.');
    }

    console.info(`Scout Inventory 2FA code for ${email}: ${code}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Your Scout Inventory 2FA code',
      text: `Your Scout Inventory verification code is ${code}. It expires in ${EMAIL_MFA_CODE_TTL_MINUTES} minutes.`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'Could not send 2FA email.');
  }
}
