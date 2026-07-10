import { NextResponse } from 'next/server';
import { EMAIL_MFA_COOKIE } from '@/lib/emailMfa';

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(EMAIL_MFA_COOKIE);
  return res;
}

