import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { computeDistanceBand } from '@/lib/distance-bands'

export const dynamic = 'force-dynamic'

/** §31 — Tanış & Kaynaş Profil Kartı */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const me = (auth as any).user

  const targetId = req.nextUrl.searchParams.get('userId')
  if (!targetId) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'userId gerekli' } }, { status: 400 })

  const [myUser, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: me.id }, select: { id: true, latitude: true, longitude: true, locationEnabled: true, showDistance: true, hobbies: true } }),
    prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true, name: true, username: true, image: true, bio: true, birthDate: true,
        city: true, membership: true, vipXp: true, vipTitle: true,
        hobbies: true, showAge: true, showCity: true, showLastActive: true,
        isVerifiedUser: true, lastActiveAt: true, createdAt: true,
        latitude: true, longitude: true, locationEnabled: true, showDistance: true,
        socialLinksPublic: true, socialLinks: true, canBroadcast: true,
        _count: { select: { followers: true, following: true } },
      },
    }),
  ])

  if (!target || !myUser) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı' } }, { status: 404 })

  // Record profile visit
  try {
    await prisma.profileVisit.upsert({
      where: { visitorId_profileId: { visitorId: me.id, profileId: targetId } },
      update: { visitedAt: new Date() },
      create: { visitorId: me.id, profileId: targetId },
    })
  } catch { /* skip */ }

  // Distance
  const distance = computeDistanceBand(
    myUser.latitude, myUser.longitude, myUser.locationEnabled, myUser.showDistance !== false,
    target.latitude, target.longitude, target.locationEnabled, target.showDistance,
  )

  // Interests + match
  const myHobbies: string[] = (() => { try { return JSON.parse(myUser.hobbies || '[]') } catch { return [] } })()
  const theirHobbies: string[] = (() => { try { return JSON.parse(target.hobbies || '[]') } catch { return [] } })()
  const commonHobbies = myHobbies.filter(i => theirHobbies.includes(i))
  const matchPercent = myHobbies.length > 0 && theirHobbies.length > 0
    ? Math.round((commonHobbies.length / Math.max(myHobbies.length, theirHobbies.length)) * 100)
    : 0

  const socials = target.socialLinksPublic ? (() => { try { return JSON.parse(target.socialLinks || '{}') } catch { return {} } })() : null

  // Social state with me
  const [isLiked, isFavorited, friendStatus, isFollowing, isBlocked, commonFollowers] = await Promise.all([
    prisma.socialAction.findUnique({ where: { actorId_targetId_type: { actorId: me.id, targetId, type: 'like' } } }).then(a => !!a),
    prisma.socialAction.findUnique({ where: { actorId_targetId_type: { actorId: me.id, targetId, type: 'favorite' } } }).then(a => !!a),
    prisma.socialAction.findFirst({ where: { OR: [{ actorId: me.id, targetId, type: 'friend_request' }, { actorId: targetId, targetId: me.id, type: 'friend_request' }] }, orderBy: { createdAt: 'desc' } }),
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: targetId } } }).then(f => !!f),
    prisma.socialAction.findUnique({ where: { actorId_targetId_type: { actorId: me.id, targetId, type: 'block' } } }).then(a => !!a && a.status === 'active'),
    prisma.$queryRaw`SELECT COUNT(*) as cnt FROM follows f1 JOIN follows f2 ON f1."followingId" = f2."followingId" WHERE f1."followerId" = ${me.id} AND f2."followerId" = ${targetId}`.then((r: any) => Number(r?.[0]?.cnt || 0)),
  ])

  // Badges/achievements
  const badges = await prisma.customBadge.findMany({
    where: { OR: [{ userId: targetId }, { tier: target.membership, isActive: true }], isActive: true },
    select: { id: true, name: true, icon: true, description: true, color: true, bgColor: true },
    take: 20,
  })

  // Profile visit count
  const visitCount = await prisma.profileVisit.count({ where: { profileId: targetId } })

  return NextResponse.json({
    success: true,
    data: {
      id: target.id,
      name: target.name,
      username: target.username,
      image: target.image,
      bio: target.bio,
      age: target.showAge && target.birthDate ? Math.floor((Date.now() - new Date(target.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
      city: target.showCity ? target.city : null,
      membership: target.membership,
      vipXp: target.vipXp,
      vipTitle: target.vipTitle,
      isVerified: target.isVerifiedUser,
      isBroadcaster: target.canBroadcast,
      lastActive: target.showLastActive ? target.lastActiveAt : null,
      joinedAt: target.createdAt,
      followers: (target as any)._count.followers,
      following: (target as any)._count.following,
      hobbies: theirHobbies,
      commonHobbies,
      matchPercent,
      distance: distance ? { band: distance.band, text: distance.text } : null,
      socialLinks: socials,
      badges,
      profileVisits: visitCount,
      commonFollowers,
      // Social state
      isLiked,
      isFavorited,
      friendStatus: friendStatus ? { status: friendStatus.status, direction: friendStatus.actorId === me.id ? 'sent' : 'received' } : null,
      isFollowing,
      isBlocked,
    },
  })
}
