import { NextRequest, NextResponse } from 'next/server'
import { getHybridSession } from '@/lib/hybrid-session'
import { isFullAdmin } from '@/lib/admin-utils'
import {
  SOCIAL_PLATFORMS,
  buildSocialAccount,
  readSocialAccounts,
  writeSocialAccounts,
  type SocialAccount,
} from '@/lib/social-accounts'

export const dynamic = 'force-dynamic'

async function requireAdmin(req: NextRequest) {
  const session = await getHybridSession(req)
  const role = ((session?.user as any)?.role || '').toString().toLowerCase()
  return session?.user && isFullAdmin(role)
}

/**
 * GET /api/admin/social-accounts — admin; tüm hesaplar + platform listesi.
 * PUT /api/admin/social-accounts — body: { accounts: [{ platform, value, enabled? }] }
 *   Boş `value` o platformu kaldırır. Geçersiz değer 400 döner.
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await requireAdmin(req))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    const accounts = await readSocialAccounts()
    return NextResponse.json({
      accounts,
      platforms: SOCIAL_PLATFORMS.map(({ id, label }) => ({ id, label })),
    })
  } catch (error) {
    console.error('Admin social accounts fetch error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!(await requireAdmin(req))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
    }
    const list = Array.isArray(body?.accounts) ? body.accounts : null
    if (!list) {
      return NextResponse.json({ error: 'accounts dizisi gerekli' }, { status: 400 })
    }
    const next: SocialAccount[] = []
    const invalid: string[] = []
    for (const item of list.slice(0, 20)) {
      const platform = (item?.platform ?? '').toString()
      const value = (item?.value ?? '').toString().trim()
      if (!value) continue // boş → kaldır
      const acc = buildSocialAccount(platform, value, item?.enabled)
      if (!acc) {
        invalid.push(platform || '?')
        continue
      }
      if (!next.some((a) => a.platform === acc.platform)) next.push(acc)
    }
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Geçersiz kullanıcı adı/bağlantı: ${invalid.join(', ')}` },
        { status: 400 }
      )
    }
    await writeSocialAccounts(next)
    return NextResponse.json({ success: true, accounts: next })
  } catch (error) {
    console.error('Admin social accounts update error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
