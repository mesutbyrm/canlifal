import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
export const dynamic = 'force-dynamic'

interface FortuneGroup {
  fortuneType: string
  _count: number
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        zodiacSign: true,
        risingSign: true,
        totalTimeSpentMinutes: true,
        lastActiveAt: true,
        credits: true,
        membership: true,
        _count: {
          select: {
            fortunes: true,
            socialPosts: true,
            followers: true,
            following: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Get fortune breakdown by type
    const fortunesByType = await prisma.fortune.groupBy({
      by: ['fortuneType'],
      where: { userId: auth.id },
      _count: true
    }) as unknown as FortuneGroup[]

    // Toplam alınan beğeni = gönderi beğenileri + kısa video beğenileri
    // (önceden yalnız gönderi beğenileri sayılıyordu; videoları olan kullanıcıda 0).
    const [socialLikes, shortLikeAgg] = await Promise.all([
      prisma.socialLike.count({ where: { post: { userId: auth.id } } }),
      prisma.shortVideo
        .aggregate({ where: { userId: auth.id }, _sum: { likesCount: true } })
        .catch(() => null),
    ])
    const likesReceived = socialLikes + Math.max(0, Number(shortLikeAgg?._sum?.likesCount) || 0)

    // Get total views
    const totalViews = await prisma.fortune.aggregate({
      where: { userId: auth.id },
      _sum: { viewCount: true }
    })

    // Mobil profil sayaçları (önceden «Beğeni», yayın, hediye, ziyaret hep 0'dı).
    const safe = async (fn: () => Promise<number>) => { try { return await fn() } catch { return 0 } }
    const sumQty = (r: any) => (r?._sum?.quantity as number | null) || 0
    const [liveStreams, streamGiftsIn, roomGiftsIn, streamGiftsOut, roomGiftsOut, profileViews] = await Promise.all([
      safe(() => prisma.videoStream.count({ where: { userId: auth.id } })),
      safe(async () => sumQty(await prisma.streamGift.aggregate({ where: { recipientId: auth.id }, _sum: { quantity: true } }))),
      safe(async () => sumQty(await prisma.chatRoomGift.aggregate({ where: { recipientId: auth.id }, _sum: { quantity: true } }))),
      safe(async () => sumQty(await prisma.streamGift.aggregate({ where: { senderId: auth.id }, _sum: { quantity: true } }))),
      safe(async () => sumQty(await prisma.chatRoomGift.aggregate({ where: { senderId: auth.id }, _sum: { quantity: true } }))),
      safe(() => prisma.profileVisit.count({ where: { profileId: auth.id } })),
    ])

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        joinedAt: user.createdAt,
        zodiacSign: user.zodiacSign,
        risingSign: user.risingSign,
        totalTimeSpentMinutes: user.totalTimeSpentMinutes,
        lastActiveAt: user.lastActiveAt,
        credits: user.credits,
        membership: user.membership
      },
      stats: {
        totalFortunes: user._count.fortunes,
        totalPosts: user._count.socialPosts,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        likesReceived,
        likes: likesReceived,
        totalViews: totalViews._sum.viewCount || 0,
        followers: user._count.followers,
        following: user._count.following,
        liveStreams,
        giftsReceivedCount: streamGiftsIn + roomGiftsIn,
        giftsSentCount: streamGiftsOut + roomGiftsOut,
        profileViews,
        fortunesByType: fortunesByType.map((f: FortuneGroup) => ({
          type: f.fortuneType,
          count: f._count
        }))
      }
    })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// Update time spent
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { minutesToAdd } = body

    if (typeof minutesToAdd !== 'number' || minutesToAdd < 0) {
      return NextResponse.json({ error: 'Geçersiz süre' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: auth.id },
      data: {
        totalTimeSpentMinutes: { increment: minutesToAdd },
        lastActiveAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Time update error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
