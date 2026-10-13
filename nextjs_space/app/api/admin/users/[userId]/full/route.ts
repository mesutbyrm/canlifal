export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'

/**
 * GET /api/admin/users/{userId}/full
 * 360'ın general + activity + jeton bölümlerini tek seferde döner (mobil admin detay).
 */
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true, email: true, name: true, username: true, phone: true, image: true,
        bio: true, preferredLanguage: true, credits: true, jetonBalance: true,
        role: true, membership: true, membershipExpiresAt: true,
        createdAt: true, lastActiveAt: true, birthDate: true, birthTime: true,
        zodiacSign: true, risingSign: true, referralCode: true, referralCreditsEarned: true,
        specialBadges: true, profileEffect: true, isBanned: true, banReason: true, bannedUntil: true,
        isFrozen: true, frozenAt: true, frozenReason: true,
        _count: {
          select: {
            fortunes: true, liveSessions: true, videoStreams: true,
            chatMessages: true, socialPosts: true, sentChatRoomGifts: true,
          }
        },
        fortuneTellerProfile: {
          select: { id: true, displayName: true, isOnline: true, approvedAt: true }
        },
      }
    })
    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

    // Stream ban check
    const streamBan = await prisma.platformSettings.findFirst({
      where: { key: `stream_ban_${params.userId}` }
    })

    return NextResponse.json({
      ...user,
      isStreamBanned: !!streamBan,
      streamBanReason: streamBan?.value || null,
    })
  } catch (e) {
    console.error('[admin user full]', e)
    return NextResponse.json({ error: 'Kullanıcı yüklenemedi' }, { status: 500 })
  }
}
