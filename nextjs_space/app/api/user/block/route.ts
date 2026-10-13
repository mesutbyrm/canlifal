export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

/**
 * POST /api/user/block
 * Body: { userId: string }
 * Toggles block: if not blocked → block, if already blocked → unblock
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId gerekli' }, { status: 400 })
    }

    if (userId === auth.id) {
      return NextResponse.json({ error: 'Kendinizi engelleyemezsiniz' }, { status: 400 })
    }

    // Check target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Check if already blocked
    const existingBlock = await prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: auth.id, blockedId: userId } },
    })

    if (existingBlock) {
      // Unblock
      await prisma.userBlock.delete({ where: { id: existingBlock.id } })
      return NextResponse.json({
        success: true,
        blocked: false,
        message: 'Engel kaldırıldı',
      })
    } else {
      // Block
      await prisma.userBlock.create({
        data: { blockerId: auth.id, blockedId: userId },
      })

      // Also unfollow both directions
      await prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: auth.id, followingId: userId },
            { followerId: userId, followingId: auth.id },
          ],
        },
      })

      return NextResponse.json({
        success: true,
        blocked: true,
        message: 'Kullanıcı engellendi',
      })
    }
  } catch (error) {
    console.error('User block error:', error)
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 })
  }
}

/**
 * GET /api/user/block
 * Returns list of users blocked by the current user
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: auth.id },
      include: {
        blocked: {
          select: { id: true, name: true, username: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: blocks.map(b => ({
        id: b.id,
        userId: b.blocked.id,
        name: b.blocked.name,
        username: b.blocked.username,
        image: b.blocked.image,
        blockedAt: b.createdAt,
      })),
    })
  } catch (error) {
    console.error('Get blocked users error:', error)
    return NextResponse.json({ error: 'Liste yüklenemedi' }, { status: 500 })
  }
}
