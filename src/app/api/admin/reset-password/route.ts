import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { userId, password, requesterId } = await req.json();

    if (!userId || !password || !requesterId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    // Verify the requester is a CG
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('id', requesterId)
      .single();

    if (roleError || roleData?.role !== 'cg') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    // Reset the password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}