import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { getCachedPlatformSetting } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * §12 — Ajansa Uygunluk Skoru
 * Ajans sahibi/yöneticisi veya admin bir aday hakkında değerlendirme skoru alabilir.
 * Skor admin panelinden yapılandırılabilir. Otomatik karar insan incelemesinin yerine geçmez.
 */
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const caller = (auth as any).user

  // Caller must be agency owner/manager or admin
  const isAdmin = ['admin', 'yonetici', 'kurucu', 'moderator'].includes(caller.role)
  let agencyId: string | null = null
  if (!isAdmin) {
    const owned = await prisma.agency.findFirst({ where: { ownerId: caller.id, status: 'approved' }, select: { id: true } })
    const membership = await prisma.agencyUser.findUnique({ where: { userId: caller.id }, select: { agencyId: true, role: true, isActive: true } })
    agencyId = owned?.id || (membership?.isActive && ['owner', 'manager'].includes(membership.role) ? membership.agencyId : null)
    if (!agencyId) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Bu bilgiye erişim yetkiniz yok' } }, { status: 403 })
    }
  }

  const targetUserId = params.userId
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true, name: true, username: true, image: true, createdAt: true,
      lastActiveAt: true, membership: true, vipXp: true, role: true,
      canBroadcast: true, canCreateRoom: true,
      isVerifiedUser: true, isFrozen: true, hiddenFromDiscovery: true, warningCount: true,
      _count: { select: { followers: true, following: true } },
    },
  })

  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı' } }, { status: 404 })
  }

  // Check if already in an agency
  const existingMembership = await prisma.agencyUser.findUnique({
    where: { userId: targetUserId },
    select: { agencyId: true, role: true, isActive: true, agency: { select: { name: true } } },
  })

  // Compute metrics
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    streamStats, recentStreams, voiceSessions, roomPresence,
    fortuneTeller, earnings, giftsSent, giftsReceived, reports,
  ] = await Promise.all([
    prisma.videoStream.aggregate({
      where: { userId: targetUserId },
      _count: true,
      _sum: { viewerCount: true, likeCount: true },
    }),
    prisma.videoStream.findMany({
      where: { userId: targetUserId, startedAt: { gte: thirtyDaysAgo } },
      select: { startedAt: true, endedAt: true, viewerCount: true, likeCount: true },
    }),
    prisma.voiceSession.aggregate({
      where: { userId: targetUserId },
      _count: true,
    }),
    prisma.chatPresence.findMany({
      where: { userId: targetUserId },
      select: { roomId: true, lastSeen: true, seatIndex: true },
    }),
    prisma.liveFortuneTeller.findFirst({
      where: { userId: targetUserId },
      select: { id: true, isOnline: true, rating: true, totalSessions: true, totalEarnings: true },
    }),
    prisma.agencyEarning.aggregate({
      where: { userId: targetUserId },
      _sum: { amount: true, originalAmount: true },
      _count: true,
    }),
    prisma.giftHistory.aggregate({ where: { senderId: targetUserId }, _count: true, _sum: { coinAmount: true } }),
    prisma.giftHistory.aggregate({ where: { receiverId: targetUserId }, _count: true, _sum: { coinAmount: true } }),
    prisma.userReport.count({ where: { reportedId: targetUserId } }),
  ])

  // Calculate stream duration (minutes)
  let totalStreamMinutes = 0
  let recentStreamMinutes = 0
  for (const s of recentStreams) {
    const end = s.endedAt || now
    const mins = (end.getTime() - s.startedAt.getTime()) / 60000
    recentStreamMinutes += Math.max(0, mins)
  }
  // Approximate total from all streams (no endedAt for old ones → estimate)
  const allStreams = await prisma.videoStream.findMany({
    where: { userId: targetUserId },
    select: { startedAt: true, endedAt: true },
  })
  for (const s of allStreams) {
    const end = s.endedAt || now
    const mins = (end.getTime() - s.startedAt.getTime()) / 60000
    totalStreamMinutes += Math.max(0, Math.min(mins, 720)) // cap at 12h per stream
  }

  // Days since registration
  const accountAgeDays = Math.floor((now.getTime() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000))
  // Days since last active
  const daysSinceActive = user.lastActiveAt ? Math.floor((now.getTime() - user.lastActiveAt.getTime()) / (24 * 60 * 60 * 1000)) : 999

  // Load configurable weights
  const weightsRaw = await getCachedPlatformSetting('agency_applicant_score_weights', '')
  let weights = {
    stream_experience: 20, activity: 20, stream_duration: 15, engagement: 15,
    profile_completion: 10, verification: 10, moderation: 10,
  }
  if (weightsRaw) {
    try { weights = { ...weights, ...JSON.parse(weightsRaw) } } catch {}
  }
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 100

  // Score each dimension (0-100)
  const dimensions: Array<{ key: string; label: string; score: number; detail: string }> = []

  // 1. Stream experience
  const streamCount = streamStats._count || 0
  const streamScore = Math.min(100, streamCount >= 50 ? 100 : streamCount >= 20 ? 80 : streamCount >= 10 ? 60 : streamCount >= 5 ? 40 : streamCount >= 1 ? 20 : 0)
  const streamLabel = streamScore >= 80 ? 'Çok iyi' : streamScore >= 60 ? 'İyi' : streamScore >= 40 ? 'Orta' : streamScore >= 20 ? 'Az' : 'Yok'
  dimensions.push({ key: 'stream_experience', label: 'Yayın Deneyimi', score: streamScore, detail: `${streamCount} yayın — ${streamLabel}` })

  // 2. Activity
  const activityScore = daysSinceActive <= 1 ? 100 : daysSinceActive <= 3 ? 80 : daysSinceActive <= 7 ? 60 : daysSinceActive <= 14 ? 40 : daysSinceActive <= 30 ? 20 : 0
  const activityLabel = activityScore >= 80 ? 'Çok iyi' : activityScore >= 60 ? 'İyi' : activityScore >= 40 ? 'Orta' : activityScore >= 20 ? 'Düşük' : 'Pasif'
  dimensions.push({ key: 'activity', label: 'Aktiflik', score: activityScore, detail: `Son aktiflik: ${daysSinceActive} gün önce — ${activityLabel}` })

  // 3. Stream duration
  const durationScore = Math.min(100, recentStreamMinutes >= 3000 ? 100 : recentStreamMinutes >= 1500 ? 80 : recentStreamMinutes >= 600 ? 60 : recentStreamMinutes >= 120 ? 40 : recentStreamMinutes >= 30 ? 20 : 0)
  const durationLabel = durationScore >= 80 ? 'Çok iyi' : durationScore >= 60 ? 'İyi' : durationScore >= 40 ? 'Orta' : durationScore >= 20 ? 'Az' : 'Yetersiz'
  dimensions.push({ key: 'stream_duration', label: 'Yayın Süresi (30 gün)', score: durationScore, detail: `${Math.round(recentStreamMinutes)} dk — ${durationLabel}` })

  // 4. Engagement (followers + gifts received + likes)
  const followers = (user as any)._count?.followers || 0
  const totalLikes = streamStats._sum?.likeCount || 0
  const engScore = Math.min(100, (followers >= 100 ? 40 : followers >= 30 ? 25 : followers >= 10 ? 15 : 0) + (totalLikes >= 500 ? 30 : totalLikes >= 100 ? 20 : totalLikes >= 20 ? 10 : 0) + ((giftsReceived._count || 0) >= 50 ? 30 : (giftsReceived._count || 0) >= 10 ? 20 : (giftsReceived._count || 0) >= 1 ? 10 : 0))
  const engLabel = engScore >= 80 ? 'Çok iyi' : engScore >= 60 ? 'İyi' : engScore >= 40 ? 'Orta' : engScore >= 20 ? 'Düşük' : 'Çok düşük'
  dimensions.push({ key: 'engagement', label: 'Etkileşim', score: engScore, detail: `${followers} takipçi, ${totalLikes} beğeni — ${engLabel}` })

  // 5. Profile completion
  let profileParts = 0
  if (user.name) profileParts++
  if (user.username) profileParts++
  if (user.image) profileParts++
  const profileScore = Math.min(100, Math.round((profileParts / 3) * 100))
  const profileLabel = profileScore >= 80 ? 'Tamamlandı' : profileScore >= 50 ? 'Kısmen eksik' : 'Eksik'
  dimensions.push({ key: 'profile_completion', label: 'Profil Tamamlanması', score: profileScore, detail: profileLabel })

  // 6. Verification
  const verifyScore = (user as any).isVerifiedUser ? 100 : 0
  dimensions.push({ key: 'verification', label: 'Doğrulama', score: verifyScore, detail: (user as any).isVerifiedUser ? 'Doğrulanmış' : 'Tamamlanmalı' })

  // 7. Moderation history (negative = bad)
  const modScore = user.isFrozen ? 0 : reports >= 5 ? 20 : (user.warningCount || 0) >= 3 ? 30 : reports >= 2 ? 50 : (user.warningCount || 0) >= 1 ? 60 : reports === 0 ? 100 : 80
  const modLabel = modScore >= 80 ? 'Temiz' : modScore >= 50 ? 'Dikkat gerektiriyor' : 'Riskli'
  dimensions.push({ key: 'moderation', label: 'Moderasyon Geçmişi', score: modScore, detail: `${reports} şikayet, ${user.warningCount || 0} uyarı — ${modLabel}` })

  // Weighted total
  const weightedTotal = dimensions.reduce((acc, d) => acc + d.score * (weights[d.key as keyof typeof weights] || 0), 0)
  const overallScore = Math.round(weightedTotal / totalWeight)

  // Overall verdict
  let verdict: string
  let verdictColor: string
  if (overallScore >= 75) { verdict = 'Ajansa uygun'; verdictColor = 'green' }
  else if (overallScore >= 50) { verdict = 'Geliştirilmesi gereken alanlar var'; verdictColor = 'yellow' }
  else if (overallScore >= 25) { verdict = 'Değerlendirme gerekli'; verdictColor = 'orange' }
  else { verdict = 'Şu an uygun değil'; verdictColor = 'red' }

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: user.id, name: user.name, username: user.username, image: user.image,
        createdAt: user.createdAt, membership: user.membership, vipXp: user.vipXp,
        accountAgeDays, daysSinceActive,
        followers: (user as any)._count?.followers || 0, following: (user as any)._count?.following || 0,
      },
      currentAgency: existingMembership ? {
        agencyName: existingMembership.agency?.name,
        role: existingMembership.role,
        isActive: existingMembership.isActive,
      } : null,
      isFortuneTeller: !!fortuneTeller,
      fortuneTellerStats: fortuneTeller ? {
        rating: fortuneTeller.rating,
        totalSessions: fortuneTeller.totalSessions,
        totalEarnings: fortuneTeller.totalEarnings,
      } : null,
      streamStats: {
        totalStreams: streamCount,
        totalStreamMinutes: Math.round(totalStreamMinutes),
        recentStreamMinutes: Math.round(recentStreamMinutes),
        avgViewers: streamCount > 0 ? Math.round((streamStats._sum?.viewerCount || 0) / streamCount) : 0,
      },
      voiceActivity: { totalSessions: voiceSessions._count || 0 },
      giftActivity: {
        sent: { count: giftsSent._count || 0, total: giftsSent._sum?.coinAmount || 0 },
        received: { count: giftsReceived._count || 0, total: giftsReceived._sum?.coinAmount || 0 },
      },
      previousEarnings: { count: earnings._count || 0, total: earnings._sum?.amount || 0 },
      dimensions,
      weights,
      overallScore,
      verdict,
      verdictColor,
      disclaimer: 'Bu skor otomatik olarak hesaplanmıştır ve yalnızca bilgilendirme amaçlıdır. Nihai karar insan incelemesi ile verilmelidir.',
    },
  })
}
