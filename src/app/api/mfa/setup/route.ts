import { NextResponse, type NextRequest } from 'next/server';
import {
  createEmailChallenge,
  isValidEmail,
  maskEmail,
  normalizeEmail,
  supabaseAdmin,
} from '@/lib/emailMfa';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const mfaEmail = normalizeEmail(String(email ?? ''));

    if (!isValidEmail(mfaEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const { error: upsertError } = await supabaseAdmin.from('user_mfa_email_settings').upsert({
      user_id: authData.user.id,
      email: mfaEmail,
      verified_at: null,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const debugCode = await createEmailChallenge(authData.user.id, mfaEmail, 'setup');

    return NextResponse.json({
      success: true,
      email: maskEmail(mfaEmail),
      debugCode: process.env.RESEND_API_KEY || process.env.NODE_ENV === 'production' ? undefined : debugCode,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error.' },
      { status: 500 }
    );
  }
}

