export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * POST /api/celebrities/:id/follow  — takip et / bırak (toggle)
 * Auth: ZORUNLU
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const celeb = await prisma.celebrity.findUnique({ where: { id }, select: { id: true } })
    if (!celeb) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Ünlü bulunamadı' } },
        { status: 404 }
      )
    }

    const existing = await prisma.celebrityFollow.findUnique({
      where: { userId_celebrityId: { userId: authUser.id, celebrityId: id } },
    })

    if (existing) {
      await prisma.$transaction([
        prisma.celebrityFollow.delete({ where: { id: existing.id } }),
        prisma.celebrity.update({ where: { id }, data: { followerCount: { decrement: 1 } } }),
      ])
      return NextResponse.json({ success: true, data: { following: false } })
    }

    await prisma.$transaction([
      prisma.celebrityFollow.create({ data: { userId: authUser.id, celebrityId: id } }),
      prisma.celebrity.update({ where: { id }, data: { followerCount: { increment: 1 } } }),
    ])

    return NextResponse.json({ success: true, data: { following: true } })
  } catch (error: any) {
    console.error('[celebrities] follow error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Takip işlemi başarısız' } },
      { status: 500 }
    )
  }
}
