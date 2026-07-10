import { NextResponse, type NextRequest } from 'next/server';
import { createEmailChallenge, maskEmail, supabaseAdmin } from '@/lib/emailMfa';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: setting, error: settingError } = await supabaseAdmin
      .from('user_mfa_email_settings')
      .select('email, verified_at')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (settingError) {
      return NextResponse.json({ error: settingError.message }, { status: 500 });
    }

    if (!setting?.email || !setting.verified_at) {
      return NextResponse.json({ error: '2FA email is not set up yet.' }, { status: 400 });
    }

    const debugCode = await createEmailChallenge(authData.user.id, setting.email, 'login');

    return NextResponse.json({
      success: true,
      email: maskEmail(setting.email),
      debugCode: process.env.RESEND_API_KEY || process.env.NODE_ENV === 'production' ? undefined : debugCode,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error.' },
      { status: 500 }
    );
  }
}

