import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET: Fetch all games (admin)
export async function GET() {
  try {
    const session = await getStaffSession()
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const games = await prisma.miniGame.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json(games)
  } catch (error: any) {
    console.error('Admin games fetch error:', error)
    return NextResponse.json({ error: 'Oyunlar yüklenemedi' }, { status: 500 })
  }
}

// POST: Create a new game
export async function POST(req: NextRequest) {
  try {
    const session = await getStaffSession()
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const game = await prisma.miniGame.create({
      data: {
        slug: body.slug,
        title: body.title,
        description: body.description || '',
        icon: body.icon || '🎮',
        isActive: body.isActive ?? true,
        entryFee: body.entryFee || 0,
        minReward: body.minReward || 5,
        maxReward: body.maxReward || 50,
        sortOrder: body.sortOrder || 0,
        config: body.config || null,
      },
    })

    return NextResponse.json(game)
  } catch (error: any) {
    console.error('Admin game create error:', error)
    return NextResponse.json({ error: 'Oyun oluşturulamadı' }, { status: 500 })
  }
}

// PUT: Update a game
export async function PUT(req: NextRequest) {
  try {
    const session = await getStaffSession()
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID belirtilmedi' }, { status: 400 })
    }

    const game = await prisma.miniGame.update({
      where: { id: body.id },
      data: {
        title: body.title,
        description: body.description,
        icon: body.icon,
        isActive: body.isActive,
        entryFee: body.entryFee,
        minReward: body.minReward,
        maxReward: body.maxReward,
        sortOrder: body.sortOrder,
        config: body.config,
      },
    })

    return NextResponse.json(game)
  } catch (error: any) {
    console.error('Admin game update error:', error)
    return NextResponse.json({ error: 'Oyun güncellenemedi' }, { status: 500 })
  }
}

// DELETE: Delete a game
export async function DELETE(req: NextRequest) {
  try {
    const session = await getStaffSession()
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const id = body?.id
    if (!id) {
      return NextResponse.json({ error: 'ID belirtilmedi' }, { status: 400 })
    }

    await prisma.miniGame.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin game delete error:', error)
    return NextResponse.json({ error: 'Oyun silinemedi' }, { status: 500 })
  }
}
