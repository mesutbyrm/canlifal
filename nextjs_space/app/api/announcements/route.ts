import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - fetch active announcements (public)
export async function GET() {
  try {
    const now = new Date()
    const announcements = await prisma.siteAnnouncement.findMany({
      where: {
        expiresAt: { gt: now }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    return NextResponse.json(announcements)
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json([])
  }
}

// POST - create login announcement (called after login)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        membership: true,
        membershipExpiresAt: true,
        favoriteTeam: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user qualifies for login announcement
    const isAdmin = user.role === 'admin'
    const isModerator = user.role === 'moderator'
    const isSiteManager = user.role === 'site_manager'
    const isStaff = isAdmin || isModerator || isSiteManager
    
    const isPremiumMember = ['premium', 'gold', 'diamond'].includes(user.membership || '')
    const membershipActive = !user.membershipExpiresAt || new Date(user.membershipExpiresAt) > new Date()
    const isVip = isPremiumMember && membershipActive

    if (!isStaff && !isVip) {
      return NextResponse.json({ ok: true, announced: false })
    }

    // Prevent duplicate announcements within last 5 minutes
    const recentAnnouncement = await prisma.siteAnnouncement.findFirst({
      where: {
        userId: user.id,
        type: 'login',
        createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) }
      }
    })

    if (recentAnnouncement) {
      return NextResponse.json({ ok: true, announced: false, reason: 'recent' })
    }

    const displayName = user.username || user.name || 'Kullanıcı'
    let badge = ''
    if (isAdmin) badge = '👑 Site Yöneticisi'
    else if (isModerator) badge = '🛡️ Moderatör'
    else if (isSiteManager) badge = '⚙️ Admin'
    else if (user.membership === 'diamond') badge = '💎 Diamond'
    else if (user.membership === 'gold') badge = '🥇 Gold'
    else if (user.membership === 'premium') badge = '⭐ Premium'

    const message = `${badge} ${displayName} giriş yaptı!`

    // Users with a specific favorite team get team colors; 'Diğer' or no team gets red
    const hasTeam = user.favoriteTeam && user.favoriteTeam !== 'Diğer'
    const announcementColor = ((isVip || isStaff) && hasTeam) ? `team:${user.favoriteTeam}` : 'red'

    await prisma.siteAnnouncement.create({
      data: {
        type: 'login',
        message,
        color: announcementColor,
        userId: user.id,
        userName: displayName,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000) // expires in 2 minutes
      }
    })

    // Cleanup old expired announcements (keep DB clean)
    await prisma.siteAnnouncement.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } }
    }).catch(() => {})

    return NextResponse.json({ ok: true, announced: true })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
