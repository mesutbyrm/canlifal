import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

const VALID_SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'x', 'facebook', 'twitch', 'discord', 'telegram', 'website']
const VALID_HOBBIES = [
  'muzik', 'oyun', 'spor', 'film', 'dizi', 'seyahat', 'yemek',
  'teknoloji', 'kitap', 'sanat', 'fotograf', 'dans', 'yoga',
  'fitness', 'dogal_yasam', 'astroloji', 'tasarim', 'moda',
  'otomobil', 'tarih', 'felsefe', 'edebiyat', 'bilim',
]

/** §32/§34 — Kullanıcı sosyal ayarları */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const me = (auth as any).user

  const user = await prisma.user.findUnique({
    where: { id: me.id },
    select: {
      hobbies: true, socialLinks: true, socialLinksPublic: true,
      showAge: true, showCity: true, showLastActive: true, showDistance: true,
      locationEnabled: true,
    },
  })
  if (!user) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 })

  return NextResponse.json({
    success: true,
    data: {
      hobbies: (() => { try { return JSON.parse(user.hobbies || '[]') } catch { return [] } })(),
      socialLinks: (() => { try { return JSON.parse(user.socialLinks || '{}') } catch { return {} } })(),
      socialLinksPublic: user.socialLinksPublic,
      showAge: user.showAge,
      showCity: user.showCity,
      showLastActive: user.showLastActive,
      showDistance: user.showDistance,
      locationEnabled: user.locationEnabled,
      availableHobbies: VALID_HOBBIES,
    },
  })
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const me = (auth as any).user

  const body = await req.json()
  const update: any = {}

  // Hobbies
  if (body.hobbies !== undefined) {
    if (!Array.isArray(body.hobbies) || body.hobbies.length > 20) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'Hobiler en fazla 20 adet olabilir' } }, { status: 400 })
    }
    update.hobbies = JSON.stringify(body.hobbies.slice(0, 20))
  }

  // Social links
  if (body.socialLinks !== undefined) {
    if (typeof body.socialLinks !== 'object') {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'Geçersiz sosyal medya verisi' } }, { status: 400 })
    }
    const cleaned: Record<string, string> = {}
    for (const [key, val] of Object.entries(body.socialLinks)) {
      if (VALID_SOCIAL_PLATFORMS.includes(key) && typeof val === 'string' && val.length <= 200) {
        cleaned[key] = val.trim()
      }
    }
    update.socialLinks = JSON.stringify(cleaned)
  }

  // Privacy toggles
  if (typeof body.socialLinksPublic === 'boolean') update.socialLinksPublic = body.socialLinksPublic
  if (typeof body.showAge === 'boolean') update.showAge = body.showAge
  if (typeof body.showCity === 'boolean') update.showCity = body.showCity
  if (typeof body.showLastActive === 'boolean') update.showLastActive = body.showLastActive
  if (typeof body.showDistance === 'boolean') update.showDistance = body.showDistance

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'Güncellenecek alan yok' } }, { status: 400 })
  }

  await prisma.user.update({ where: { id: me.id }, data: update })

  return NextResponse.json({ success: true, message: 'Ayarlar güncellendi' })
}
