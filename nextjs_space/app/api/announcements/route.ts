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

// Section names mapping
const SECTION_NAMES: Record<string, { tr: string; en: string; icon: string }> = {
  'chat': { tr: 'Fal Sohbet', en: 'Fortune Chat', icon: '💬' },
  'fortunes': { tr: 'Fallar', en: 'Fortunes', icon: '🔮' },
  'games': { tr: 'Oyun Merkezi', en: 'Game Center', icon: '🎮' },
  'social': { tr: 'Sosyal', en: 'Social', icon: '👥' },
  'gifts': { tr: 'Hediyeler', en: 'Gifts', icon: '🎁' },
  'blog': { tr: 'Blog', en: 'Blog', icon: '📝' },
  'live-tellers': { tr: 'Canlı Falcı', en: 'Live Tellers', icon: '✨' },
  'memberships': { tr: 'Üyelik', en: 'Memberships', icon: '👑' },
  'profile': { tr: 'Profil', en: 'Profile', icon: '👤' },
  'dashboard': { tr: 'Panel', en: 'Dashboard', icon: '📊' },
  'home': { tr: 'Ana Sayfa', en: 'Home', icon: '🏠' },
}

// Detect section from path
function detectSection(path: string | null): string | null {
  if (!path) return null
  const lowerPath = path.toLowerCase()
  
  if (lowerPath.includes('/chat')) return 'chat'
  if (lowerPath.includes('/fortune') || lowerPath.includes('/fal') || lowerPath.includes('/tarot') || 
      lowerPath.includes('/coffee') || lowerPath.includes('/dream') || lowerPath.includes('/palm') ||
      lowerPath.includes('/horoscope') || lowerPath.includes('/numerology') || lowerPath.includes('/aura') ||
      lowerPath.includes('/angel') || lowerPath.includes('/katina') || lowerPath.includes('/yesno') ||
      lowerPath.includes('/love') || lowerPath.includes('/birthchart')) return 'fortunes'
  if (lowerPath.includes('/game')) return 'games'
  if (lowerPath.includes('/social')) return 'social'
  if (lowerPath.includes('/gift')) return 'gifts'
  if (lowerPath.includes('/blog')) return 'blog'
  if (lowerPath.includes('/live-teller')) return 'live-tellers'
  if (lowerPath.includes('/membership')) return 'memberships'
  if (lowerPath.includes('/profile')) return 'profile'
  if (lowerPath.includes('/dashboard')) return 'dashboard'
  if (lowerPath === '/tr' || lowerPath === '/en' || lowerPath === '/tr/' || lowerPath === '/en/') return 'home'
  
  return null
}

// POST - create login or section entry announcement
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { section, path } = body

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

    // Check if user qualifies for announcement
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

    // Detect section from path or use provided section
    const detectedSection = section || detectSection(path)
    const sectionInfo = detectedSection ? SECTION_NAMES[detectedSection] : null
    
    // Check if this section is enabled in admin settings
    if (detectedSection) {
      const sectionSettings = await prisma.platformSettings.findUnique({
        where: { key: 'announcement_sections' }
      })
      
      if (sectionSettings) {
        try {
          const sections = JSON.parse(sectionSettings.value)
          // If the section is explicitly disabled, don't announce
          if (sections[detectedSection] === false) {
            return NextResponse.json({ ok: true, announced: false, reason: 'section_disabled' })
          }
        } catch {
          // If parsing fails, continue with announcement
        }
      }
    }
    
    // Announcement type: section entry or login
    const announcementType = sectionInfo ? 'section_entry' : 'login'

    // Prevent duplicate announcements within last 5 minutes for same section
    const recentAnnouncement = await prisma.siteAnnouncement.findFirst({
      where: {
        userId: user.id,
        type: announcementType,
        createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
        ...(sectionInfo ? { message: { contains: sectionInfo.tr } } : {})
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

    // Create message based on section
    let message: string
    if (sectionInfo) {
      message = `${badge} ${displayName} ${sectionInfo.icon} ${sectionInfo.tr} bölümüne giriş yaptı!`
    } else {
      message = `${badge} ${displayName} giriş yaptı!`
    }

    // Users with a specific favorite team get team colors; 'Diğer' or no team gets red
    const hasTeam = user.favoriteTeam && user.favoriteTeam !== 'Diğer'
    const announcementColor = ((isVip || isStaff) && hasTeam) ? `team:${user.favoriteTeam}` : 'red'

    await prisma.siteAnnouncement.create({
      data: {
        type: announcementType,
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

    return NextResponse.json({ ok: true, announced: true, section: detectedSection })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
