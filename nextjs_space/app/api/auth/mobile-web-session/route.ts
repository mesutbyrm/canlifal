import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import prisma from '@/lib/db'
import { verifyMobileToken } from '@/lib/mobile-auth'
import { isTokenStillValid } from '@/lib/token-revocation'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** middleware.ts'deki yönetim sayfası rolleriyle birebir aynı. */
const ADMIN_PAGE_ROLES = ['admin', 'yonetici', 'kurucu', 'moderator', 'finans', 'ajans_admin', 'destek', 'icerik_moderator']
/** Köprü oturumu kısa tutulur; süresi dolunca uygulama yeniden açar. */
const SESSION_MAX_AGE = 2 * 60 * 60 // 2 saat

/** next-auth getToken / withAuth ile aynı çerez adı kuralı. */
function sessionCookieName(): string {
  const url = process.env.NEXTAUTH_URL
  const secure = url ? url.startsWith('https://') : !!process.env.VERCEL
  return secure ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
}

/**
 * CSRF koruması: istek yalnız sitenin kendi sayfasından gelebilir
 * (uygulamanın WebView'i siteyi kendi kaynağıyla yükler). Başka bir siteden
 * gönderilen form / fetch reddedilir.
 */
function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false
  let originHost: string
  try {
    originHost = new URL(origin).host.toLowerCase()
  } catch {
    return false
  }
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim().toLowerCase()
  if (host && originHost === host) return true
  const site = process.env.NEXTAUTH_URL
  if (site) {
    try {
      if (new URL(site).host.toLowerCase() === originHost) return true
    } catch {}
  }
  return false
}

/**
 * POST /api/auth/mobile-web-session
 * Body (JSON): { token: <mobil erişim JWT> }
 * Header: X-Canlifal-Mobile: 1, Origin: sitenin kendisi
 *
 * Uygulama içindeki web yönetim paneli köprüsü. Güvenlik:
 *  • Yalnız POST + JSON gövde (anahtar adres satırında / geçmişte görünmez)
 *  • Aynı kaynak (Origin) zorunlu → başka siteden tetiklenemez
 *  • Mobil erişim anahtarı imza + süre + iptal kontrolünden geçer
 *  • Yalnız yönetim rolleri (normal kullanıcı 403)
 *  • Kısa oturum (2 saat), httpOnly + Secure + SameSite=Lax çerez
 *  • IP başına hız sınırı ve her açılış denetim kaydına yazılır
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await guardRateLimit(req, 'admin_web_session', { limit: 10, windowMs: 60_000 })
    if (limited) return limited

    if (req.headers.get('x-canlifal-mobile') !== '1' || !isSameOrigin(req)) {
      return NextResponse.json({ ok: false, error: 'İzin verilmeyen istek' }, { status: 403 })
    }
    if (!(req.headers.get('content-type') || '').includes('application/json')) {
      return NextResponse.json({ ok: false, error: 'Geçersiz istek' }, { status: 415 })
    }

    const body = await req.json().catch(() => ({} as any))
    const raw = String(body?.token || '').trim()
    if (!raw || raw.length > 4096) {
      return NextResponse.json({ ok: false, error: 'Anahtar yok' }, { status: 400 })
    }

    const payload = verifyMobileToken(raw)
    if (!payload || payload.type !== 'access') {
      return NextResponse.json({ ok: false, error: 'Geçersiz oturum' }, { status: 401 })
    }
    if (!(await isTokenStillValid(raw, payload))) {
      return NextResponse.json({ ok: false, error: 'Oturum sonlandırılmış' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, image: true, role: true, credits: true, preferredLanguage: true },
    })
    if (!user) return NextResponse.json({ ok: false, error: 'Kullanıcı bulunamadı' }, { status: 401 })
    if (!ADMIN_PAGE_ROLES.includes(String(user.role))) {
      return NextResponse.json({ ok: false, error: 'Yönetim yetkisi yok' }, { status: 403 })
    }

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) return NextResponse.json({ ok: false, error: 'Sunucu yapılandırması eksik' }, { status: 500 })

    // auth-options.ts jwt() geri çağrısıyla aynı alanlar; köprü işareti izlenebilirlik için.
    const sessionToken = await encode({
      token: {
        sub: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.image,
        image: user.image,
        role: user.role || 'user',
        credits: user.credits ?? 10,
        preferredLanguage: user.preferredLanguage || 'tr',
        via: 'mobile_admin_bridge',
      },
      secret,
      maxAge: SESSION_MAX_AGE,
    })

    recordAudit({
      action: 'admin_web_session',
      targetType: 'User',
      targetId: user.id,
      actorId: user.id,
      actorRole: String(user.role),
      ip: getAuditIp(req),
      metadata: { via: 'mobile_admin_bridge', maxAgeSec: SESSION_MAX_AGE },
    }).catch(() => {})

    const name = sessionCookieName()
    const res = NextResponse.json({ ok: true, expiresIn: SESSION_MAX_AGE })
    res.cookies.set(name, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: name.startsWith('__Secure-'),
      maxAge: SESSION_MAX_AGE,
    })
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (e) {
    console.error('[mobile-web-session]', e)
    return NextResponse.json({ ok: false, error: 'Oturum açılamadı' }, { status: 500 })
  }
}
