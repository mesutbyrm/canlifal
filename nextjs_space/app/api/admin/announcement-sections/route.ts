import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

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
      where: { key: 'announcement_sections' }
    })

    if (setting) {
      try {
        const sections = JSON.parse(setting.value)
        return NextResponse.json({ sections })
      } catch {
        return NextResponse.json({ sections: {} })
      }
    }

    // Default: all sections enabled
    return NextResponse.json({ sections: {} })
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
    const { sections } = body

    if (!sections || typeof sections !== 'object') {
      return NextResponse.json({ error: 'Invalid sections data' }, { status: 400 })
    }

    await prisma.platformSettings.upsert({
      where: { key: 'announcement_sections' },
      update: {
        value: JSON.stringify(sections),
        description: 'Announcement section visibility settings'
      },
      create: {
        key: 'announcement_sections',
        value: JSON.stringify(sections),
        description: 'Announcement section visibility settings'
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error saving announcement sections:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
