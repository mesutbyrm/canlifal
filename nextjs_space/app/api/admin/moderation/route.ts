import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET - reported/flagged content
export async function GET(request: NextRequest) {
  try {
    const session = await getStaffSession()
    if (!session?.user?.id || !(await staffCan((session.user as any).role, (session.user as any).id, 'moderation.report.handle', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Get recent social posts for moderation
    const posts = await prisma.socialPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
        _count: { select: { comments: true, likes: true } }
      }
    })

    // Get recent comments
    const comments = await prisma.socialComment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
        post: { select: { id: true, content: true } }
      }
    })

    // Get recent users for overview
    const recentUsers = await prisma.user.findMany({
      select: {
        id: true, name: true, username: true, image: true, email: true,
        role: true, createdAt: true,
        _count: { select: { socialPosts: true, socialComments: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    })

    return NextResponse.json({ posts, comments, flaggedUsers: recentUsers })
  } catch (error) {
    console.error('Moderation fetch error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST - take moderation action
export async function POST(request: NextRequest) {
  try {
    const session = await getStaffSession()
    if (!session?.user?.id || !(await staffCan((session.user as any).role, (session.user as any).id, 'moderation.report.handle', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json()
    const { action, targetId, reason } = body

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
              message: 'İçeriğiniz topluluk kurallarına aykırı olduğu için kaldırıldı.' + (reason ? ' Sebep: ' + reason : ''),
              title: 'Moderasyon Bildirimi'
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
            message: 'Yorumunuz topluluk kurallarına aykırı olduğu için kaldırıldı.' + (reason ? ' Sebep: ' + reason : ''),
            title: 'Moderasyon Bildirimi'
          })
        }
        break
      }
      case 'warn_user': {
        await createNotificationWithPush({
          userId: targetId,
          type: 'moderation',
          message: 'Hesabınız topluluk kurallarını ihlal nedeniyle uyarı aldı.' + (reason ? ' Sebep: ' + reason : '') + ' Tekrarlayan ihlaller hesabınızın askıya alınmasına neden olabilir.',
          title: 'Uyarı'
        })
        break
      }
    }

    recordAudit({ actorId: session.user.id, action: `moderation_${action}`, targetType: action === 'warn_user' ? 'user' : 'social_content', targetId: targetId, ip: getAuditIp(request), metadata: { reason } }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Moderation action error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
