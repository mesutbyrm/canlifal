import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const pathname = req.nextUrl.pathname

    // Extract language from pathname
    const lang = pathname.split('/')?.[1]
    const isValidLang = lang === 'en' || lang === 'tr'

    // If no valid language in path, redirect to Turkish version
    if (!isValidLang) {
      return NextResponse.redirect(new URL(`/tr${pathname}`, req.url))
    }

    // Admin routes
    if (pathname.includes('/admin')) {
      if (!isAuth || token?.role !== 'admin') {
        return NextResponse.redirect(new URL(`/${lang}/login`, req.url))
      }
    }

    // Protected user routes (fortunes removed - now accessible without login)
    const protectedRoutes = ['/dashboard', '/profile']
    const isProtectedRoute = protectedRoutes.some(route => pathname.includes(route))
    
    if (isProtectedRoute && !isAuth) {
      return NextResponse.redirect(new URL(`/${lang}/login`, req.url))
    }

    // Auth routes (login, register) - redirect if already authenticated
    const authRoutes = ['/login', '/register']
    const isAuthRoute = authRoutes.some(route => pathname.includes(route))
    
    if (isAuthRoute && isAuth) {
      return NextResponse.redirect(new URL(`/${lang}/dashboard`, req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: () => true, // We handle authorization in the middleware function
    },
  }
)

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|favicon.png|og-image.png|manifest.json|sw.js|sitemap\\.xml|robots\\.txt|icons/.*|.*\\.jpg|.*\\.png|.*\\.svg|.*\\.mp3).*)',
  ],
}
