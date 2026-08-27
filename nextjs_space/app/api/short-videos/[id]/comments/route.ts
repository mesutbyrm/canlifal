export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { mapAuthor, safeInt, parseMentions } from '@/lib/short-videos'

/**
 * GET /api/short-videos/:id/comments
 * Auth: opsiyonel
 * Query:
 *   - parentId: verilirse o yorumun yanıtları; verilmezse üst düzey yorumlar (sabit önce)
 *   - limit
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '30') || 30, 50)
    const parentId = searchParams.get('parentId') || null

    const authUser = await authenticateRequest(req).catch(() => null)

    const comments = await prisma.shortVideoComment.findMany({
      where: { videoId, parentId: parentId ?? null },
      take: limit,
      orderBy: parentId
        ? [{ createdAt: 'asc' }]
        : [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, username: true, name: true, image: true } },
        _count: { select: { replies: true } },
        ...(authUser
          ? { likes: { where: { userId: authUser.id }, select: { id: true }, take: 1 } }
          : {}),
      },
    })

    const mapped = comments.map((c: any) => ({
      id: c.id,
      content: c.content,
      likesCount: safeInt(c.likesCount),
      isPinned: !!c.isPinned,
      parentId: c.parentId ?? null,
      repliesCount: safeInt(c._count?.replies),
      createdAt: c.createdAt.toISOString(),
      author: mapAuthor(c.user),
      likedByMe: authUser ? (c.likes?.length ?? 0) > 0 : false,
    }))

    return NextResponse.json({ success: true, data: { comments: mapped } })
  } catch (error: any) {
    console.error('[short-videos] Comments GET error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Yorumlar alınamadı' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/short-videos/:id/comments
 * Auth: ZORUNLU
 * Body: { content: string, parentId?: string }
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

    // Rate limit: kısa video yorumu
    const rateLimited = await guardRateLimit(req, 'comment', { userId: authUser.id })
    if (rateLimited) return rateLimited

    const { id: videoId } = await params
    const body = await req.json().catch(() => ({}))
    const content = (body.content || '').trim()
    const parentId: string | null = body.parentId || null

    if (!content || content.length < 1 || content.length > 500) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CONTENT', message: 'Yorum 1-500 karakter olmalıdır' } },
        { status: 400 }
      )
    }

    const video = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { id: true, userId: true, commentSetting: true },
    })
    if (!video) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Video bulunamadı' } },
        { status: 404 }
      )
    }

    // Yorum ayarı kontrolü
    if (video.commentSetting === 'off' && video.userId !== authUser.id) {
      return NextResponse.json(
        { success: false, error: { code: 'COMMENTS_OFF', message: 'Bu videoda yorumlar kapalı' } },
        { status: 403 }
      )
    }
    if (video.commentSetting === 'followers' && video.userId !== authUser.id) {
      const follows = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: authUser.id, followingId: video.userId } },
        select: { id: true },
      }).catch(() => null)
      if (!follows) {
        return NextResponse.json(
          { success: false, error: { code: 'FOLLOWERS_ONLY', message: 'Yalnızca takipçiler yorum yapabilir' } },
          { status: 403 }
        )
      }
    }

    // Yanıt ise parent doğrulama
    let parentComment: { id: string; userId: string } | null = null
    if (parentId) {
      parentComment = await prisma.shortVideoComment.findUnique({
        where: { id: parentId },
        select: { id: true, userId: true, videoId: true } as any,
      }) as any
      if (!parentComment || (parentComment as any).videoId !== videoId) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_PARENT', message: 'Yanıt verilen yorum bulunamadı' } },
          { status: 400 }
        )
      }
    }

    const [comment] = await prisma.$transaction([
      prisma.shortVideoComment.create({
        data: { videoId, userId: authUser.id, content, parentId: parentId ?? null },
        include: { user: { select: { id: true, username: true, name: true, image: true } } },
      }),
      prisma.shortVideo.update({ where: { id: videoId }, data: { commentsCount: { increment: 1 } } }),
    ])

    const updatedVideo = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { commentsCount: true },
    })

    // --- Bildirimler (fire-and-forget) ---
    const authorName = comment.user.name || comment.user.username || 'Bir kullanıcı'
    ;(async () => {
      try {
        // Video sahibine yorum bildirimi
        if (video.userId !== authUser.id) {
          await createNotificationWithPush({
            userId: video.userId,
            type: 'short_video_comment',
            title: 'Yeni yorum',
            message: `${authorName} videona yorum yaptı`,
            fromUserId: authUser.id,
            fromUserName: authorName,
            targetPath: 'short_video',
            targetId: videoId,
            data: JSON.stringify({ videoId, commentId: comment.id }),
          })
        }
        // Yanıt ise üst yorum sahibine
        if (parentComment && parentComment.userId !== authUser.id && parentComment.userId !== video.userId) {
          await createNotificationWithPush({
            userId: parentComment.userId,
            type: 'short_video_reply',
            title: 'Yorumuna yanıt',
            message: `${authorName} yorumuna yanıt verdi`,
            fromUserId: authUser.id,
            fromUserName: authorName,
            targetPath: 'short_video',
            targetId: videoId,
            data: JSON.stringify({ videoId, commentId: comment.id, parentId }),
          })
        }
        // Mention'lar
        const usernames = parseMentions(content)
        if (usernames.length > 0) {
          const users = await prisma.user.findMany({
            where: { username: { in: usernames } },
            select: { id: true },
          })
          for (const u of users) {
            if (u.id === authUser.id) continue
            await createNotificationWithPush({
              userId: u.id,
              type: 'short_video_mention',
              title: 'Bir yorumda etiketlendin',
              message: `${authorName} bir yorumda senden bahsetti`,
              fromUserId: authUser.id,
              fromUserName: authorName,
              targetPath: 'short_video',
              targetId: videoId,
              data: JSON.stringify({ videoId, commentId: comment.id }),
            })
          }
        }
      } catch (e) {
        console.error('[short-videos] comment notify error (non-fatal):', e)
      }
    })()

    return NextResponse.json(
      {
        success: true,
        data: {
          comment: {
            id: comment.id,
            content: comment.content,
            likesCount: 0,
            isPinned: false,
            parentId: comment.parentId ?? null,
            repliesCount: 0,
            createdAt: comment.createdAt.toISOString(),
            author: mapAuthor(comment.user),
            likedByMe: false,
          },
          commentsCount: safeInt(updatedVideo?.commentsCount),
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[short-videos] Comment POST error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Yorum gönderilemedi' } },
      { status: 500 }
    )
  }
}
