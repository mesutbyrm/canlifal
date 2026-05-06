import prisma from '@/lib/db'

/**
 * Trigger an event-based announcement.
 * Reads event templates from PlatformSettings and creates a SiteAnnouncement if the template is enabled.
 * 
 * @param eventType - One of: game_win, gift_sent, voice_room_join, social_post, fortune_reading
 * @param placeholders - Key-value pairs to replace in the message template ({user}, {game}, {gift}, {room}, {fortune})
 * @param userId - The user who triggered the event (optional, for targeting)
 * @param userName - Display name of the user
 * @param userRole - Role/category of the user (for group targeting)
 */
export async function triggerEventAnnouncement(
  eventType: string,
  placeholders: Record<string, string>,
  userId?: string,
  userName?: string,
  userRole?: string
) {
  try {
    // Get event templates from settings
    const setting = await prisma.platformSettings.findUnique({
      where: { key: 'event_announcement_templates' }
    })
    if (!setting?.value) return null

    let templates: Record<string, any>
    try {
      templates = JSON.parse(setting.value)
    } catch {
      return null
    }

    const template = templates[eventType]
    if (!template || !template.enabled) return null

    // Check target groups
    if (template.targetType === 'groups' && template.targetGroups?.length > 0) {
      const normalizedRole = (userRole || 'free').toLowerCase()
      if (!template.targetGroups.includes(normalizedRole)) {
        return null
      }
    }

    // Build message from template
    let message = template.messageTemplate || ''
    for (const [key, value] of Object.entries(placeholders)) {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }

    if (!message.trim()) return null

    // Prevent duplicate announcements within 2 minutes
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000)
    const existing = await prisma.siteAnnouncement.findFirst({
      where: {
        type: `event_${eventType}`,
        message,
        createdAt: { gte: twoMinAgo }
      }
    })
    if (existing) return null

    // Create the announcement
    const announcement = await prisma.siteAnnouncement.create({
      data: {
        type: `event_${eventType}`,
        message,
        color: '#a855f7',
        userId: userId || null,
        userName: userName || null,
        maxPasses: template.maxPasses || 1,
        expiresAt: new Date(Date.now() + (template.duration || 4) * 60 * 1000),
      }
    })

    return announcement
  } catch (error) {
    console.error(`Event announcement error (${eventType}):`, error)
    return null
  }
}
