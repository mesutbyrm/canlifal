import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const pathname = req.nextUrl.pathname

    // Extract first segment
    const firstSegment = pathname.split('/')?.[1]

    // 301 redirect /tr/* and /en/* to clean URLs (SEO: single canonical URL)
    if (firstSegment === 'tr' || firstSegment === 'en') {
      const cleanPath = pathname.replace(/^\/(tr|en)/, '') || '/'
      return NextResponse.redirect(new URL(cleanPath, req.url), 301)
    }

    // Internal rewrite: add /tr prefix for Next.js [lang] routing
    // URL stays clean (e.g., /fortunes) but internally serves /tr/fortunes
    const rewriteUrl = new URL(`/tr${pathname === '/' ? '' : pathname}${req.nextUrl.search}`, req.url)

    // Admin routes
    if (pathname.includes('/admin')) {
      if (!isAuth || token?.role !== 'admin') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Protected user routes
    const protectedRoutes = ['/dashboard', '/profile']
    const isProtectedRoute = protectedRoutes.some(route => pathname.includes(route))
    
    if (isProtectedRoute && !isAuth) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Auth routes (login, register) - redirect if already authenticated
    const authRoutes = ['/login', '/register']
    const isAuthRoute = authRoutes.some(route => pathname.includes(route))
    
    if (isAuthRoute && isAuth) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Rewrite to /tr/ prefix internally
    return NextResponse.rewrite(rewriteUrl)
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|favicon.png|og-image.png|manifest.json|sw.js|OneSignalSDKWorker\\.js|sitemap\\.xml|robots\\.txt|icons/.*|.*\\.jpg|.*\\.png|.*\\.svg|.*\\.mp3).*)',
  ],
}
