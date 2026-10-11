export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'

/**
 * POST /api/short-videos/:id/like
 * Auth: ZORUNLU — toggle beğeni
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

    const { id: videoId } = await params

    // Check video exists
    const video = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { id: true, likesCount: true, userId: true },
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Video bulunamadı' } },
        { status: 404 }
      )
    }

    // Check if already liked
    const existing = await prisma.shortVideoLike.findUnique({
      where: { videoId_userId: { videoId, userId: authUser.id } },
    })

    let liked: boolean
    let likesCount: number

    if (existing) {
      // Unlike
      await prisma.$transaction([
        prisma.shortVideoLike.delete({ where: { id: existing.id } }),
        prisma.shortVideo.update({
          where: { id: videoId },
          data: { likesCount: { decrement: 1 } },
        }),
      ])
      liked = false
      likesCount = Math.max(0, video.likesCount - 1)
    } else {
      // Like
      await prisma.$transaction([
        prisma.shortVideoLike.create({
          data: { videoId, userId: authUser.id },
        }),
        prisma.shortVideo.update({
          where: { id: videoId },
          data: { likesCount: { increment: 1 } },
        }),
      ])
      liked = true
      likesCount = video.likesCount + 1

      // Video sahibine beğeni bildirimi (fire-and-forget, kendi videosu değilse)
      if (video.userId !== authUser.id) {
        ;(async () => {
          try {
            const liker = await prisma.user.findUnique({
              where: { id: authUser.id },
              select: { name: true, username: true },
            })
            const likerName = liker?.name || liker?.username || 'Bir kullanıcı'
            await createNotificationWithPush({
              userId: video.userId,
              type: 'short_video_like',
              title: 'Videon beğenildi',
              message: `${likerName} videonu beğendi`,
              fromUserId: authUser.id,
              fromUserName: likerName,
              targetPath: 'short_video',
              targetId: videoId,
              data: JSON.stringify({ videoId }),
            })
          } catch (e) {
            console.error('[short-videos] like notify error (non-fatal):', e)
          }
        })()
      }
    }

    return NextResponse.json({
      success: true,
      data: { liked, likesCount },
    })
  } catch (error: any) {
    console.error('[short-videos] Like error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Beğeni işlemi başarısız' } },
      { status: 500 }
    )
  }
}
