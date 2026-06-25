import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getCachedPlatformSetting } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// POST - create event-based announcement (game win, gift, voice room, social post, fortune)
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { eventType, details } = body
    // eventType: game_win, gift_sent, voice_room_join, social_post, fortune_reading
    // details: { gameName?, giftName?, roomName?, fortuneType? }

    if (!eventType) {
      return NextResponse.json({ error: 'Etkinlik tipi gerekli' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, name: true, username: true, role: true, membership: true, favoriteTeam: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Load event templates from platform settings (cached)
    const templatesRaw = await getCachedPlatformSetting('event_announcement_templates', '')

    if (!templatesRaw) {
      return NextResponse.json({ ok: true, announced: false, reason: 'no_templates' })
    }

    let templates: Record<string, any>
    try {
      templates = JSON.parse(templatesRaw)
    } catch {
      return NextResponse.json({ ok: true, announced: false, reason: 'invalid_templates' })
    }

    const template = templates[eventType]
    if (!template || !template.enabled) {
      return NextResponse.json({ ok: true, announced: false, reason: 'template_disabled' })
    }

    // Check target groups
    if (template.targetType === 'groups' && template.targetGroups?.length > 0) {
      const userCategory = getUserCategory(user)
      if (!userCategory || !template.targetGroups.includes(userCategory)) {
        return NextResponse.json({ ok: true, announced: false, reason: 'not_in_target_group' })
      }
    }

    // Prevent duplicate within last 2 minutes
    const recent = await prisma.siteAnnouncement.findFirst({
      where: {
        userId: user.id,
        type: `event_${eventType}`,
        createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) }
      }
    })
    if (recent) {
      return NextResponse.json({ ok: true, announced: false, reason: 'recent' })
    }

    const displayName = user.username || user.name || 'Kullanıcı'
    
    // Build message from template
    let message = (template.messageTemplate || '{user} bir etkinlik gerçekleştirdi!')
      .replace(/{user}/g, displayName)
      .replace(/{game}/g, details?.gameName || 'oyun')
      .replace(/{gift}/g, details?.giftName || 'hediye')
      .replace(/{room}/g, details?.roomName || 'oda')
      .replace(/{fortune}/g, details?.fortuneType || 'fal')

    const hasTeam = user.favoriteTeam && user.favoriteTeam !== 'Diğer'
    const color = hasTeam ? `team:${user.favoriteTeam}` : 'red'

    await prisma.siteAnnouncement.create({
      data: {
        type: `event_${eventType}`,
        message,
        color,
        userId: user.id,
        userName: displayName,
        maxPasses: template.maxPasses || 1,
        expiresAt: new Date(Date.now() + (template.duration || 5) * 1000)
      }
    })

    // Cleanup old
    await prisma.siteAnnouncement.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } }
    }).catch(() => {})

    return NextResponse.json({ ok: true, announced: true })
  } catch (error) {
    console.error('Error creating event announcement:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

function getUserCategory(user: { role: string; membership: string | null }): string | null {
  if (user.role === 'admin') return 'admin'
  if (user.role === 'moderator') return 'moderator'
  if (user.role === 'site_manager') return 'site_manager'
  if (user.membership === 'diamond') return 'diamond'
  if (user.membership === 'gold') return 'gold'
  if (user.membership === 'premium') return 'premium'
  return 'free'
}
