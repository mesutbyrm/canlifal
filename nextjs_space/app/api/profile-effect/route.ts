import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { accessibleTiers } from '@/lib/cosmetics'

export const dynamic = 'force-dynamic'

/**
 * Profil efekti (avatar çevresindeki parçacık arka planı) — kullanıcı seçimi.
 * Web `components/profile-effects.tsx` ile aynı anahtarlar; önceden yalnızca
 * admin atayabiliyordu, uygulamadaki seçim sunucuya hiç kaydedilmiyordu.
 * Zarf diğer kozmetik uçlarıyla aynı: `{success, data:{items, selected}}`.
 */
const PROFILE_EFFECTS = [
  { key: 'sparkles', name: 'Pırıltı', tier: 'gold' },
  { key: 'stars', name: 'Yıldızlar', tier: 'gold' },
  { key: 'hearts', name: 'Kalpler', tier: 'gold' },
  { key: 'snow', name: 'Kar', tier: 'gold' },
  { key: 'bubbles', name: 'Baloncuklar', tier: 'gold' },
  { key: 'confetti', name: 'Konfeti', tier: 'premium' },
  { key: 'fire', name: 'Ateş', tier: 'premium' },
  { key: 'rainbow', name: 'Gökkuşağı', tier: 'premium' },
  { key: 'lightning', name: 'Şimşek', tier: 'diamond' },
  { key: 'aurora', name: 'Kuzey Işıkları', tier: 'diamond' },
] as const

export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    let membership: string | null = null
    let selected: string | null = null
    if (authUser) {
      const u = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { membership: true, profileEffect: true },
      })
      membership = u?.membership ?? null
      selected = u?.profileEffect ?? null
    }
    const tiers = accessibleTiers(membership)
    const items = PROFILE_EFFECTS.filter((e) => tiers.includes(e.tier)).map((e, i) => ({
      id: e.key,
      key: e.key,
      name: e.name,
      tier: e.tier,
      isActive: true,
      sortOrder: i,
    }))
    return NextResponse.json({ success: true, data: { items, selected, membership } })
  } catch (error) {
    console.error('[profile-effect] GET', error)
    return NextResponse.json({ success: false, error: 'Bir hata oluştu' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) return NextResponse.json({ success: false, error: 'Giriş yapın' }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const raw = body?.id ?? body?.key ?? body?.value ?? null
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { membership: true },
    })
    if (raw == null || raw === '') {
      await prisma.user.update({ where: { id: authUser.id }, data: { profileEffect: null } })
      return NextResponse.json({ success: true, data: { selected: null } })
    }
    const effect = PROFILE_EFFECTS.find((e) => e.key === String(raw))
    if (!effect) {
      return NextResponse.json({ success: false, error: 'Geçersiz efekt' }, { status: 404 })
    }
    if (!accessibleTiers(user?.membership ?? null).includes(effect.tier)) {
      return NextResponse.json(
        { success: false, error: 'Bu efekt için üyeliğin yetmiyor', requiredTier: effect.tier },
        { status: 403 },
      )
    }
    await prisma.user.update({ where: { id: authUser.id }, data: { profileEffect: effect.key } })
    return NextResponse.json({ success: true, data: { selected: effect.key } })
  } catch (error) {
    console.error('[profile-effect] POST', error)
    return NextResponse.json({ success: false, error: 'Bir hata oluştu' }, { status: 500 })
  }
}
