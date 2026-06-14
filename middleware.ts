import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 10 minutes in ms

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

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Check inactivity timeout
  if (user && !isLoginPage) {
    const lastActivity = req.cookies.get('last_activity')?.value
    const now = Date.now()

    if (lastActivity) {
      const elapsed = now - parseInt(lastActivity)
      if (elapsed > INACTIVITY_TIMEOUT) {
        // Clear last_activity cookie and redirect to login
        const redirectRes = NextResponse.redirect(new URL('/login', req.url))
        redirectRes.cookies.delete('last_activity')
        return redirectRes
      }
    }

    // Update last activity timestamp
    res.cookies.set('last_activity', String(now), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
  }

  return res
}

export const config = {
  matcher: ['/', '/inventory/:path*', '/contact', '/login', '/admin'],
};