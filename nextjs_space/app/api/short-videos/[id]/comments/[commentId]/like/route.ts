export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { safeInt } from '@/lib/short-videos'

/**
 * POST /api/short-videos/:id/comments/:commentId/like
 * Auth: ZORUNLU — toggle yorum beğenisi
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const { commentId } = await params

    const comment = await prisma.shortVideoComment.findUnique({
      where: { id: commentId },
      select: { id: true, likesCount: true },
    })
    if (!comment) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Yorum bulunamadı' } },
        { status: 404 }
      )
    }

    const existing = await prisma.shortVideoCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId: authUser.id } },
    })

    let liked: boolean
    let likesCount: number

    if (existing) {
      await prisma.$transaction([
        prisma.shortVideoCommentLike.delete({ where: { id: existing.id } }),
        prisma.shortVideoComment.update({ where: { id: commentId }, data: { likesCount: { decrement: 1 } } }),
      ])
      liked = false
      likesCount = Math.max(0, safeInt(comment.likesCount) - 1)
    } else {
      await prisma.$transaction([
        prisma.shortVideoCommentLike.create({ data: { commentId, userId: authUser.id } }),
        prisma.shortVideoComment.update({ where: { id: commentId }, data: { likesCount: { increment: 1 } } }),
      ])
      liked = true
      likesCount = safeInt(comment.likesCount) + 1
    }

    return NextResponse.json({ success: true, data: { liked, likesCount } })
  } catch (error: any) {
    console.error('[short-videos] Comment like error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Yorum beğenisi başarısız' } },
      { status: 500 }
    )
  }
}
