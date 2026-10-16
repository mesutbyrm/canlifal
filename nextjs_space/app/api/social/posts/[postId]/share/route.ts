import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { createNotificationWithPush } from '@/lib/notify'
import { socialPostNoun } from '@/lib/social-post-noun'

export const dynamic = 'force-dynamic'

/**
 * POST /api/social/posts/[postId]/share — paylaşım bildirimi.
 * Gönderi sahibine «X videonu/gönderini paylaştı» bildirimi gider (kendi
 * gönderisi hariç; aynı kişi için saatte bir).
 */
export async function POST(request: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) return NextResponse.json({ success: true, notified: false })
    const post = await prisma.socialPost.findUnique({
      where: { id: params.postId },
      select: { id: true, userId: true, postType: true, imageUrl: true, fortuneType: true },
    })
    if (!post) return NextResponse.json({ success: false, error: 'Gönderi bulunamadı' }, { status: 404 })
    if (post.userId === authUser.id) return NextResponse.json({ success: true, notified: false })
    await createNotificationWithPush({
      userId: post.userId,
      type: 'share',
      message: socialPostNoun(post) + ' paylaştı',
      postId: post.id,
      fromUserId: authUser.id,
      fromUserName: authUser.name || 'Birisi',
    })
    return NextResponse.json({ success: true, notified: true })
  } catch (error) {
    console.error('[social/share]', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
