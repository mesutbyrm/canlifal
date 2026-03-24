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

    // 301 redirects from old English URLs to new Turkish URLs (SEO)
    const LEGACY_REDIRECTS: Record<string, string> = {
      '/fortunes': '/fallar',
      '/fortunes/numerology': '/fallar/numeroloji',
      '/fortunes/palm': '/fallar/el-fali',
      '/fortunes/aura': '/fallar/aura-analizi',
      '/fortunes/angel': '/fallar/melek-kartlari',
      '/fortunes/birthchart': '/fallar/dogum-haritasi',
      '/fortunes/coffee': '/fallar/kahve-fali',
      '/fortunes/dream': '/fallar/ruya-yorumu',
      '/fortunes/horoscope': '/fallar/burc-yorumu',
      '/fortunes/love': '/fallar/ask-uyumu',
      '/fortunes/tarot': '/fallar/tarot-fali',
      '/fortunes/yesno': '/fallar/evet-hayir',
      '/fortunes/istikhara': '/fallar/istihare',
      '/fortunes/katina': '/fallar/katina',
      '/fortunes/kursundokme': '/fallar/kursundokme',
      '/become-teller': '/falci-ol',
      '/chat': '/sohbet',
      '/contact': '/iletisim',
      '/credits': '/jeton',
      '/dashboard': '/panel',
      '/games': '/oyunlar',
      '/gifts': '/hediyeler',
      '/leaderboard': '/siralama',
      '/live-room': '/canli-oda',
      '/live-tellers': '/canli-falcilar',
      '/login': '/giris',
      '/memberships': '/uyelik',
      '/messages': '/mesajlar',
      '/profile': '/profil',
      '/referral': '/davet',
      '/register': '/kayit-ol',
      '/reset-password': '/sifre-sifirla',
      '/settings': '/ayarlar',
      '/social': '/sosyal',
      '/teller-chat': '/falci-sohbet',
      '/forgot-password': '/sifremi-unuttum',
    }

    // Check for legacy English URL redirects
    for (const [oldPath, newPath] of Object.entries(LEGACY_REDIRECTS)) {
      if (pathname === oldPath || pathname.startsWith(oldPath + '/')) {
        const rest = pathname.slice(oldPath.length)
        return NextResponse.redirect(new URL(newPath + rest + req.nextUrl.search, req.url), 301)
      }
    }

    // Internal rewrite: add /tr prefix for Next.js [lang] routing
    // URL stays clean (e.g., /fallar) but internally serves /tr/fallar
    const rewriteUrl = new URL(`/tr${pathname === '/' ? '' : pathname}${req.nextUrl.search}`, req.url)

    // Admin routes
    if (pathname.includes('/admin')) {
      const adminRoles = ['admin', 'yonetici', 'moderator', 'finans']
      if (!isAuth || !adminRoles.includes(token?.role as string)) {
        return NextResponse.redirect(new URL('/giris', req.url))
      }
    }

    // Protected user routes
    const protectedRoutes = ['/panel', '/profil']
    const isProtectedRoute = protectedRoutes.some(route => pathname.includes(route))
    
    if (isProtectedRoute && !isAuth) {
      return NextResponse.redirect(new URL('/giris', req.url))
    }

    // Auth routes (login, register) - redirect if already authenticated
    const authRoutes = ['/giris', '/kayit-ol']
    const isAuthRoute = authRoutes.some(route => pathname.includes(route))
    
    if (isAuthRoute && isAuth) {
      return NextResponse.redirect(new URL('/panel', req.url))
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
