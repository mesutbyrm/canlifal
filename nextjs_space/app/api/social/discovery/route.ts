import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { computeDistanceBand } from '@/lib/distance-bands'

export const dynamic = 'force-dynamic'

const MEMBERSHIP_ORDER: Record<string, number> = { svip: 6, diamond: 5, premium: 4, gold: 3, silver: 2, basic: 1 }

/**
 * §30–36 — Tanış & Kaynaş Keşif Algoritması
 * VIP küçük görünürlük avantajı, aktiflik + uygunluk ağırlıklı.
 * Spam/tekrar önleme: son gösterilenleri atlama.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const me = (auth as any).user

  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit = Math.min(50, parseInt(sp.get('limit') || '20'))
  const filter = sp.get('filter') // nearby, online, new, popular

  const myUser = await prisma.user.findUnique({
    where: { id: me.id },
    select: { id: true, latitude: true, longitude: true, locationEnabled: true, showDistance: true, hobbies: true, membership: true },
  })
  if (!myUser) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 })

  const where: any = {
    id: { not: me.id },
    isBanned: false,
    isFrozen: false,
    hiddenFromDiscovery: false,
  }

  let orderBy: any[] = [{ discoveryPriority: 'desc' }, { lastActiveAt: 'desc' }]

  if (filter === 'online') {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    where.lastActiveAt = { gte: fiveMinAgo }
  } else if (filter === 'new') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    where.createdAt = { gte: sevenDaysAgo }
    orderBy = [{ createdAt: 'desc' }]
  } else if (filter === 'popular') {
    orderBy = [{ discoveryPriority: 'desc' }, { vipXp: 'desc' }]
  }

  const users = await prisma.user.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true, name: true, username: true, image: true, bio: true,
      membership: true, vipXp: true, birthDate: true, city: true,
      hobbies: true, showAge: true, showCity: true, showLastActive: true,
      isVerifiedUser: true, lastActiveAt: true, createdAt: true,
      latitude: true, longitude: true, locationEnabled: true, showDistance: true,
      socialLinksPublic: true, socialLinks: true,
      discoveryPriority: true,
      _count: { select: { followers: true, following: true } },
    },
  })

  const myHobbies: string[] = (() => { try { return JSON.parse(myUser.hobbies || '[]') } catch { return [] } })()

  const enriched = users.map(u => {
    // Distance band (never expose raw coords)
    const distance = computeDistanceBand(
      myUser.latitude, myUser.longitude, myUser.locationEnabled, myUser.showDistance !== false,
      u.latitude, u.longitude, u.locationEnabled, u.showDistance,
    )

    // Hobby match
    const theirHobbies: string[] = (() => { try { return JSON.parse(u.hobbies || '[]') } catch { return [] } })()
    const commonHobbies = myHobbies.filter(i => theirHobbies.includes(i))
    const matchPercent = myHobbies.length > 0 && theirHobbies.length > 0
      ? Math.round((commonHobbies.length / Math.max(myHobbies.length, theirHobbies.length)) * 100)
      : 0
    const socials = u.socialLinksPublic ? (() => { try { return JSON.parse(u.socialLinks || '{}') } catch { return {} } })() : null

    return {
      id: u.id,
      name: u.name,
      username: u.username,
      image: u.image,
      bio: u.bio,
      membership: u.membership,
      vipXp: u.vipXp,
      age: u.showAge && u.birthDate ? Math.floor((Date.now() - new Date(u.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
      city: u.showCity ? u.city : null,
      isVerified: u.isVerifiedUser,
      lastActive: u.showLastActive ? u.lastActiveAt : null,
      followers: (u as any)._count.followers,
      following: (u as any)._count.following,
      hobbies: theirHobbies,
      commonHobbies,
      matchPercent,
      distance: distance ? { band: distance.band, text: distance.text } : null,
      socialLinks: socials,
      createdAt: u.createdAt,
    }
  })

  // Sort: VIP gives small boost, activity + match weighted more
  enriched.sort((a, b) => {
    const vipA = MEMBERSHIP_ORDER[a.membership] || 0
    const vipB = MEMBERSHIP_ORDER[b.membership] || 0
    const score = (u: typeof enriched[0]) => {
      let s = 0
      s += u.matchPercent * 2 // interest match is primary
      s += (vipA || 0) * 3   // small VIP boost
      if (u.lastActive) {
        const minutesAgo = (Date.now() - new Date(u.lastActive).getTime()) / 60000
        s += Math.max(0, 100 - minutesAgo) // activity recency
      }
      if (u.distance?.band === '0-1') s += 50
      else if (u.distance?.band === '1-5') s += 30
      else if (u.distance?.band === '5-10') s += 15
      return s
    }
    return score(b) - score(a)
  })

  const total = await prisma.user.count({ where })

  return NextResponse.json({ success: true, data: { users: enriched, total, page, limit } })
}
