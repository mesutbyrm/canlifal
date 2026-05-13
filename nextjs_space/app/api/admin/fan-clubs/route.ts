import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator']

// List all fan clubs with celebrity info
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const fanClubs = await prisma.fanClub.findMany({
      orderBy: { memberCount: 'desc' },
      include: {
        celebrity: { select: { id: true, name: true, slug: true, profileImage: true, category: true } },
        _count: { select: { members: true, posts: true } },
      },
    })

    return NextResponse.json({ fanClubs })
  } catch (error) {
    console.error('Admin fan clubs GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// Update fan club
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const { id, description, rules, isActive, coverImage } = body

    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }

    const data: any = {}
    if (description !== undefined) data.description = description || null
    if (rules !== undefined) data.rules = rules ? JSON.stringify(rules) : null
    if (isActive !== undefined) data.isActive = isActive
    if (coverImage !== undefined) data.coverImage = coverImage || null

    const fanClub = await prisma.fanClub.update({
      where: { id },
      data,
    })

    return NextResponse.json({ fanClub })
  } catch (error) {
    console.error('Admin fan clubs PUT error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
