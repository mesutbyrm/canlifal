import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Default settings for each category
const DEFAULT_SETTINGS: Record<string, Record<string, boolean>> = {
  admin: { home: true, chat: true, fortunes: true, games: true, social: true, gifts: true, blog: true, 'live-tellers': true, memberships: true, profile: true, dashboard: true },
  moderator: { home: true, chat: true, fortunes: true, games: true, social: true, gifts: true, blog: true, 'live-tellers': true, memberships: true, profile: true, dashboard: true },
  site_manager: { home: true, chat: true, fortunes: true, games: true, social: true, gifts: true, blog: true, 'live-tellers': true, memberships: true, profile: true, dashboard: true },
  diamond: { home: true, chat: false, fortunes: false, games: false, social: false, gifts: false, blog: false, 'live-tellers': false, memberships: false, profile: false, dashboard: false },
  gold: { home: true, chat: false, fortunes: false, games: false, social: false, gifts: false, blog: false, 'live-tellers': false, memberships: false, profile: false, dashboard: false },
  premium: { home: true, chat: false, fortunes: false, games: false, social: false, gifts: false, blog: false, 'live-tellers': false, memberships: false, profile: false, dashboard: false },
}

// GET - fetch current announcement section settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !['admin', 'moderator', 'site_manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const setting = await prisma.platformSettings.findUnique({
      where: { key: 'announcement_category_sections' }
    })

    if (setting) {
      try {
        const categorySettings = JSON.parse(setting.value)
        return NextResponse.json({ categorySettings })
      } catch {
        return NextResponse.json({ categorySettings: DEFAULT_SETTINGS })
      }
    }

    // Return default settings
    return NextResponse.json({ categorySettings: DEFAULT_SETTINGS })
  } catch (error) {
    console.error('Error fetching announcement sections:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST - save announcement section settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !['admin', 'moderator', 'site_manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { categorySettings } = body

    if (!categorySettings || typeof categorySettings !== 'object') {
      return NextResponse.json({ error: 'Invalid categorySettings data' }, { status: 400 })
    }

    await prisma.platformSettings.upsert({
      where: { key: 'announcement_category_sections' },
      update: {
        value: JSON.stringify(categorySettings),
        description: 'Per-category announcement section visibility settings'
      },
      create: {
        key: 'announcement_category_sections',
        value: JSON.stringify(categorySettings),
        description: 'Per-category announcement section visibility settings'
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error saving announcement sections:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
