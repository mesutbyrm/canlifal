import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'

export const dynamic = 'force-dynamic'

// GET - reported/flagged content
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    // Get recent social posts for moderation
    const posts = await prisma.socialPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, username: true, avatar: true } },
        _count: { select: { comments: true, likes: true } }
      }
    })

    // Get recent comments
    const comments = await prisma.socialComment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, username: true, avatar: true } },
        post: { select: { id: true, content: true } }
      }
    })

    // Get users with warnings
    const flaggedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { isStreamBanned: true },
          { role: 'user' }
        ]
      },
      select: {
        id: true, name: true, username: true, avatar: true, email: true,
        isStreamBanned: true, streamBanReason: true, createdAt: true,
        _count: { select: { socialPosts: true, socialComments: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    })

    return NextResponse.json({ posts, comments, flaggedUsers })
  } catch (error) {
    console.error('Moderation fetch error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST - take moderation action
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, targetId, targetType, reason } = body

    switch (action) {
      case 'delete_post': {
        const post = await prisma.socialPost.findUnique({ where: { id: targetId } })
        if (post) {
          await prisma.socialComment.deleteMany({ where: { postId: targetId } })
          await prisma.socialLike.deleteMany({ where: { postId: targetId } })
          await prisma.socialPost.delete({ where: { id: targetId } })
          if (post.userId) {
            await createNotificationWithPush({
              userId: post.userId,
              type: 'moderation',
              message: `\u0130\u00e7eri\u011finiz topluluk kurallar\u0131na ayk\u0131r\u0131 oldu\u011fu i\u00e7in kald\u0131r\u0131ld\u0131.${reason ? ' Sebep: ' + reason : ''}`,
              title: '\u26a0\ufe0f Moderasyon Bildirimi'
            })
          }
        }
        break
      }
      case 'delete_comment': {
        const comment = await prisma.socialComment.findUnique({ where: { id: targetId } })
        if (comment) {
          await prisma.socialComment.delete({ where: { id: targetId } })
          await createNotificationWithPush({
            userId: comment.userId,
            type: 'moderation',
            message: `Yorumunuz topluluk kurallar\u0131na ayk\u0131r\u0131 oldu\u011fu i\u00e7in kald\u0131r\u0131ld\u0131.${reason ? ' Sebep: ' + reason : ''}`,
            title: '\u26a0\ufe0f Moderasyon Bildirimi'
          })
        }
        break
      }
      case 'warn_user': {
        await createNotificationWithPush({
          userId: targetId,
          type: 'moderation',
          message: `Hesab\u0131n\u0131z topluluk kurallar\u0131n\u0131 ihlal nedeniyle uyar\u0131 ald\u0131.${reason ? ' Sebep: ' + reason : ''} Tekrarlayan ihlaller hesab\u0131n\u0131z\u0131n ask\u0131ya al\u0131nmas\u0131na neden olabilir.`,
          title: '\u26a0\ufe0f Uyar\u0131'
        })
        break
      }
      case 'ban_stream': {
        await prisma.user.update({
          where: { id: targetId },
          data: { isStreamBanned: true, streamBanReason: reason || 'Kural ihlali' }
        })
        await createNotificationWithPush({
          userId: targetId,
          type: 'moderation',
          message: `Yay\u0131n yasa\u011f\u0131 uyguland\u0131. Sebep: ${reason || 'Kural ihlali'}`,
          title: '\ud83d\udeab Yay\u0131n Yasa\u011f\u0131'
        })
        break
      }
      case 'unban_stream': {
        await prisma.user.update({
          where: { id: targetId },
          data: { isStreamBanned: false, streamBanReason: null }
        })
        await createNotificationWithPush({
          userId: targetId,
          type: 'moderation',
          message: 'Yay\u0131n yasa\u011f\u0131n\u0131z kald\u0131r\u0131ld\u0131. Topluluk kurallar\u0131na uygun davran\u0131n\u0131z.',
          title: '\u2705 Yasak Kald\u0131r\u0131ld\u0131'
        })
        break
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Moderation action error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
