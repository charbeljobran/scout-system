import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes
const MFA_SETUP_PATH = '/mfa/setup'
const MFA_VERIFY_PATH = '/mfa/verify'
const EMAIL_MFA_COOKIE = 'email_mfa_session'
const EMAIL_MFA_ENABLED = false // Email 2FA is disabled for now.

const hashMfaToken = async (token: string) => {
  const secret =
    process.env.EMAIL_MFA_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    'local-email-mfa-secret'
  const encoded = new TextEncoder().encode(`${token}:${secret}`)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isLoginPage = req.nextUrl.pathname === '/login'
  const isMfaPage = req.nextUrl.pathname === MFA_SETUP_PATH || req.nextUrl.pathname === MFA_VERIFY_PATH

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (user && !isLoginPage) {
    if (EMAIL_MFA_ENABLED) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { data: mfaSetting } = await supabaseAdmin
        .from('user_mfa_email_settings')
        .select('verified_at')
        .eq('user_id', user.id)
        .maybeSingle()

      const hasEmailMfa = Boolean(mfaSetting?.verified_at)
      let hasMfaSession = false

      if (hasEmailMfa) {
        const mfaToken = req.cookies.get(EMAIL_MFA_COOKIE)?.value

        if (mfaToken) {
          const tokenHash = await hashMfaToken(mfaToken)
          const { data: mfaSession } = await supabaseAdmin
            .from('user_mfa_email_sessions')
            .select('id')
            .eq('user_id', user.id)
            .eq('token_hash', tokenHash)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle()

          hasMfaSession = Boolean(mfaSession)
        }
      }

      if (!hasEmailMfa || !hasMfaSession) {
        const target = hasEmailMfa ? MFA_VERIFY_PATH : MFA_SETUP_PATH

        if (req.nextUrl.pathname !== target) {
          return NextResponse.redirect(new URL(target, req.url))
        }
      } else if (isMfaPage) {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    const lastActivity = req.cookies.get('last_activity')?.value
    const now = Date.now()

    if (lastActivity) {
      const elapsed = now - parseInt(lastActivity)
      if (elapsed > INACTIVITY_TIMEOUT) {
        await supabase.auth.signOut()
        const redirectRes = NextResponse.redirect(new URL('/login', req.url))
        redirectRes.cookies.delete('last_activity')
        redirectRes.cookies.delete(EMAIL_MFA_COOKIE)
        return redirectRes
      }
    }

    res.cookies.set('last_activity', String(now), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
  }

  return res
}

export const config = {
  matcher: ['/', '/inventory/:path*', '/contact', '/about', '/login', '/admin', '/members', '/mfa/:path*'],
}
