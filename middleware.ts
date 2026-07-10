import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes
const MFA_SETUP_PATH = '/mfa/setup'
const MFA_VERIFY_PATH = '/mfa/verify'

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
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (assurance?.currentLevel !== 'aal2') {
      const target = assurance?.nextLevel === 'aal2' ? MFA_VERIFY_PATH : MFA_SETUP_PATH

      if (req.nextUrl.pathname !== target) {
        return NextResponse.redirect(new URL(target, req.url))
      }
    } else if (isMfaPage) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    const lastActivity = req.cookies.get('last_activity')?.value
    const now = Date.now()

    if (lastActivity) {
      const elapsed = now - parseInt(lastActivity)
      if (elapsed > INACTIVITY_TIMEOUT) {
        await supabase.auth.signOut()
        const redirectRes = NextResponse.redirect(new URL('/login', req.url))
        redirectRes.cookies.delete('last_activity')
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
