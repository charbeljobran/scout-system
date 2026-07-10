import { NextResponse, type NextRequest } from 'next/server';
import {
  EMAIL_MFA_COOKIE,
  EMAIL_MFA_SESSION_TTL_SECONDS,
  generateSessionToken,
  hashCode,
  hashToken,
  supabaseAdmin,
} from '@/lib/emailMfa';

export async function POST(req: NextRequest) {
  try {
    const { code, purpose } = await req.json();
    const cleanCode = String(code ?? '').replace(/\D/g, '').slice(0, 6);
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (cleanCode.length !== 6 || (purpose !== 'setup' && purpose !== 'login')) {
      return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const userId = authData.user.id;
    const now = new Date().toISOString();
    const expectedHash = hashCode(userId, cleanCode);

    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('user_mfa_email_challenges')
      .select('id, email, attempts')
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .eq('code_hash', expectedHash)
      .is('consumed_at', null)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (challengeError) {
      return NextResponse.json({ error: challengeError.message }, { status: 500 });
    }

    if (!challenge) {
      const { data: latestChallenge } = await supabaseAdmin
        .from('user_mfa_email_challenges')
        .select('id, attempts')
        .eq('user_id', userId)
        .eq('purpose', purpose)
        .is('consumed_at', null)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestChallenge) {
        await supabaseAdmin
          .from('user_mfa_email_challenges')
          .update({ attempts: Number(latestChallenge.attempts ?? 0) + 1 })
          .eq('id', latestChallenge.id);
      }

      return NextResponse.json({ error: 'That code was not accepted. Try the newest email code.' }, { status: 400 });
    }

    if (Number(challenge.attempts ?? 0) >= 5) {
      await supabaseAdmin
        .from('user_mfa_email_challenges')
        .update({ consumed_at: now })
        .eq('id', challenge.id);

      return NextResponse.json({ error: 'Too many attempts. Send a new code and try again.' }, { status: 429 });
    }

    const { error: consumeError } = await supabaseAdmin
      .from('user_mfa_email_challenges')
      .update({ consumed_at: now })
      .eq('id', challenge.id);

    if (consumeError) {
      return NextResponse.json({ error: consumeError.message }, { status: 500 });
    }

    if (purpose === 'setup') {
      const { error: settingError } = await supabaseAdmin
        .from('user_mfa_email_settings')
        .update({ verified_at: now, updated_at: now })
        .eq('user_id', userId)
        .eq('email', challenge.email);

      if (settingError) {
        return NextResponse.json({ error: settingError.message }, { status: 500 });
      }
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + EMAIL_MFA_SESSION_TTL_SECONDS * 1000).toISOString();

    const { error: sessionError } = await supabaseAdmin.from('user_mfa_email_sessions').insert({
      user_id: userId,
      token_hash: hashToken(sessionToken),
      expires_at: expiresAt,
    });

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(EMAIL_MFA_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: EMAIL_MFA_SESSION_TTL_SECONDS,
    });

    return res;
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
