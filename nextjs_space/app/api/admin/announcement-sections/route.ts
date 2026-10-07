import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { invalidateCache } from '@/lib/cache'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic'

const ALL_SECTIONS = ['home', 'chat', 'fortunes', 'games', 'social', 'gifts', 'blog', 'live-tellers', 'memberships', 'profile', 'dashboard']

// New format: { approved, maxPasses, sections }
interface CategoryConfig {
  approved: boolean
  maxPasses: number
  sections: Record<string, boolean>
}

function getDefaultConfig(catKey: string): CategoryConfig {
  const isStaff = ['admin', 'moderator', 'site_manager'].includes(catKey)
  const sections: Record<string, boolean> = {}
  ALL_SECTIONS.forEach(s => { sections[s] = isStaff ? true : s === 'home' })
  return { approved: true, maxPasses: 1, sections }
}

function getDefaultSettings(): Record<string, CategoryConfig> {
  const result: Record<string, CategoryConfig> = {}
  ;['admin', 'moderator', 'site_manager', 'diamond', 'gold', 'premium'].forEach(k => {
    result[k] = getDefaultConfig(k)
  })
  return result
}

// Migrate old flat format { catKey: { section: bool } } to new format
function migrateSettings(raw: Record<string, unknown>): Record<string, CategoryConfig> {
  const defaults = getDefaultSettings()
  const result: Record<string, CategoryConfig> = {}

  for (const catKey of Object.keys(defaults)) {
    const val = raw[catKey] as Record<string, unknown> | undefined
    if (!val) {
      result[catKey] = defaults[catKey]
      continue
    }
    // Check if already new format
    if ('approved' in val && 'maxPasses' in val && 'sections' in val) {
      result[catKey] = {
        approved: val.approved as boolean,
        maxPasses: val.maxPasses as number,
        sections: val.sections as Record<string, boolean>
      }
    } else {
      // Old flat format — migrate
      const sections: Record<string, boolean> = {}
      ALL_SECTIONS.forEach(s => { sections[s] = (val[s] as boolean) ?? defaults[catKey].sections[s] })
      result[catKey] = { approved: true, maxPasses: 1, sections }
    }
  }
  return result
}

// GET - fetch current announcement section settings
export async function GET(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !(await staffCan(user.role, (session?.user as any)?.id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans', 'site_manager']))) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const [setting, giftSetting] = await Promise.all([
      prisma.platformSettings.findUnique({ where: { key: 'announcement_category_sections' } }),
      prisma.platformSettings.findUnique({ where: { key: 'gift_announcement_settings' } })
    ])

    let categorySettings = getDefaultSettings()
    if (setting) {
      try {
        categorySettings = migrateSettings(JSON.parse(setting.value))
      } catch {}
    }

    let giftAnnouncementSettings = { enabled: true, maxPasses: 2, expireMinutes: 3, minAmount: 1000 }
    if (giftSetting) {
      try {
        giftAnnouncementSettings = { ...giftAnnouncementSettings, ...JSON.parse(giftSetting.value) }
      } catch {}
    }

    return NextResponse.json({ categorySettings, giftAnnouncementSettings })
  } catch (error) {
    console.error('Error fetching announcement sections:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST - save announcement section settings (supports single category or all)
export async function POST(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !(await staffCan(user.role, (session?.user as any)?.id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans', 'site_manager']))) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const body = await request.json()
    const { categoryKey, categoryConfig, categorySettings, giftAnnouncementSettings } = body

    // Handle gift announcement settings save
    if (giftAnnouncementSettings) {
      await prisma.platformSettings.upsert({
        where: { key: 'gift_announcement_settings' },
        update: { value: JSON.stringify(giftAnnouncementSettings) },
        create: {
          key: 'gift_announcement_settings',
          value: JSON.stringify(giftAnnouncementSettings),
          description: 'Gift announcement banner settings (enabled, maxPasses, expireMinutes, minAmount)'
        }
      })
      invalidateCache('platform:gift_announcement_settings')
      invalidateCache('platform:__all__')
      return NextResponse.json({ ok: true })
    }

    // Load existing settings
    const existing = await prisma.platformSettings.findUnique({
      where: { key: 'announcement_category_sections' }
    })

    let current: Record<string, CategoryConfig> = getDefaultSettings()
    if (existing) {
      try {
        current = migrateSettings(JSON.parse(existing.value))
      } catch { /* use defaults */ }
    }

    if (categoryKey && categoryConfig) {
      // Single category save
      current[categoryKey] = categoryConfig
    } else if (categorySettings && typeof categorySettings === 'object') {
      // Full save (backward compatible)
      current = migrateSettings(categorySettings)
    } else {
      return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 })
    }

    await prisma.platformSettings.upsert({
      where: { key: 'announcement_category_sections' },
      update: {
        value: JSON.stringify(current),
        description: 'Per-category announcement section visibility settings'
      },
      create: {
        key: 'announcement_category_sections',
        value: JSON.stringify(current),
        description: 'Per-category announcement section visibility settings'
      }
    })
    invalidateCache('platform:announcement_category_sections')
    invalidateCache('platform:__all__')

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error saving announcement sections:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
