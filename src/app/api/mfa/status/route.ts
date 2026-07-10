import { NextResponse, type NextRequest } from 'next/server';
import {
  EMAIL_MFA_COOKIE,
  hashToken,
  supabaseAdmin,
} from '@/lib/emailMfa';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const userId = authData.user.id;
  const { data: setting, error: settingError } = await supabaseAdmin
    .from('user_mfa_email_settings')
    .select('verified_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (settingError) {
    return NextResponse.json({ error: settingError.message }, { status: 500 });
  }

  if (!setting?.verified_at) {
    return NextResponse.json({ nextPath: '/mfa/setup', verified: false });
  }

  const mfaToken = req.cookies.get(EMAIL_MFA_COOKIE)?.value;

  if (!mfaToken) {
    return NextResponse.json({ nextPath: '/mfa/verify', verified: false });
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('user_mfa_email_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('token_hash', hashToken(mfaToken))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  return NextResponse.json({
    nextPath: session ? '/' : '/mfa/verify',
    verified: Boolean(session),
  });
}

