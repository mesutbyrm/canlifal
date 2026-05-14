export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// GET - fetch active stories (not expired) grouped by user
export async function GET() {
  try {
    const now = new Date()
    const stories = await prisma.userStory.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: now },
      },
      include: {
        user: {
          select: { id: true, name: true, image: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by user
    const grouped: Record<string, { user: any; stories: any[] }> = {}
    for (const s of stories) {
      if (!grouped[s.userId]) {
        grouped[s.userId] = { user: s.user, stories: [] }
      }
      grouped[s.userId].stories.push({
        id: s.id,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        caption: s.caption,
        viewCount: s.viewCount,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })
    }

    return NextResponse.json({ storyGroups: Object.values(grouped) })
  } catch (error) {
    console.error('Stories fetch error:', error)
    return NextResponse.json({ storyGroups: [] })
  }
}

// POST - create a new story
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { mediaUrl, mediaType, caption } = body

    if (!mediaUrl) {
      return NextResponse.json({ error: 'Medya gerekli' }, { status: 400 })
    }

    // Stories expire after 24 hours
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const story = await prisma.userStory.create({
      data: {
        userId: session.user.id,
        mediaUrl,
        mediaType: mediaType || 'image',
        caption: caption || null,
        expiresAt,
      },
    })

    return NextResponse.json({ story })
  } catch (error) {
    console.error('Story create error:', error)
    return NextResponse.json({ error: 'Hikaye oluşturulamadı' }, { status: 500 })
  }
}

// DELETE - delete own story
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const storyId = searchParams.get('id')

    if (!storyId) {
      return NextResponse.json({ error: 'Hikaye ID gerekli' }, { status: 400 })
    }

    // Verify ownership
    const story = await prisma.userStory.findFirst({
      where: { id: storyId, userId: session.user.id },
    })

    if (!story) {
      return NextResponse.json({ error: 'Hikaye bulunamadı' }, { status: 404 })
    }

    await prisma.userStory.delete({ where: { id: storyId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Story delete error:', error)
    return NextResponse.json({ error: 'Hikaye silinemedi' }, { status: 500 })
  }
}
