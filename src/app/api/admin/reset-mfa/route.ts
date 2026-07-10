import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing user id.' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const requesterId = authData.user.id;

    if (requesterId === userId) {
      return NextResponse.json({ error: 'You cannot reset your own 2FA here.' }, { status: 400 });
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('id', requesterId)
      .single();

    if (roleError || roleData?.role !== 'cg') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const { data: factorsData, error: factorsError } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId });

    if (factorsError) {
      return NextResponse.json({ error: factorsError.message }, { status: 500 });
    }

    const factors = factorsData?.factors ?? [];

    for (const factor of factors) {
      const { error } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
        userId,
        id: factor.id,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const { error: sessionsError } = await supabaseAdmin
      .from('user_mfa_email_sessions')
      .delete()
      .eq('user_id', userId);

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    const { error: challengesError } = await supabaseAdmin
      .from('user_mfa_email_challenges')
      .delete()
      .eq('user_id', userId);

    if (challengesError) {
      return NextResponse.json({ error: challengesError.message }, { status: 500 });
    }

    const { count, error: settingsError } = await supabaseAdmin
      .from('user_mfa_email_settings')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, removed: factors.length + (count ?? 0) });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
