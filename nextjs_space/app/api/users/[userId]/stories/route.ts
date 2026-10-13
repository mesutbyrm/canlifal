/**
 * GET /api/users/{userId}/stories
 *
 * Bir kullanıcının AKTİF (süresi dolmamış) hikâyelerini listeler.
 * Mobil profil «Hikâyeler» sekmesi için; `SocialStoryItem` şemasıyla uyumlu.
 * Kimlik isteğe bağlıdır (Bearer veya web çerezi); engellenen/engelleyen kullanıcılara 403 döner.
 *
 * Şema değişikliği YOK.
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

/** Hikâye oynatma süresi (mobil ile aynı varsayılan) */
const IMAGE_DURATION_MS = 5000
const VIDEO_DURATION_MS = 15000

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const key = params.userId
    if (!key) return NextResponse.json({ error: 'Kullanıcı gerekli' }, { status: 400 })

    const target = await prisma.user.findFirst({
      where: { OR: [{ id: key }, { username: key.toLowerCase() }] },
      select: { id: true, name: true, username: true, image: true },
    })
    if (!target) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const viewer = await authenticateRequest(request).catch(() => null)

    // Gizlilik: iki yönlü engel kontrolü
    if (viewer?.id && viewer.id !== target.id) {
      const block = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: viewer.id, blockedId: target.id },
            { blockerId: target.id, blockedId: viewer.id },
          ],
        },
        select: { id: true },
      })
      if (block) {
        return NextResponse.json({ error: 'Bu içeriğe erişiminiz yok' }, { status: 403 })
      }
    }

    const now = new Date()
    const rows = await prisma.userStory.findMany({
      where: { userId: target.id, isActive: true, expiresAt: { gt: now } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        mediaUrl: true,
        mediaType: true,
        caption: true,
        viewCount: true,
        createdAt: true,
        expiresAt: true,
      },
    })

    const stories = rows.map((s: any) => ({
      id: s.id,
      mediaUrl: s.mediaUrl,
      type: s.mediaType === 'video' ? 'video' : 'image',
      caption: s.caption ?? null,
      createdAt: s.createdAt,
      durationMs: s.mediaType === 'video' ? VIDEO_DURATION_MS : IMAGE_DURATION_MS,
      viewCount: s.viewCount,
      expiresAt: s.expiresAt,
    }))

    return NextResponse.json({
      user: target,
      total: stories.length,
      stories,
    })
  } catch (error) {
    console.error('[users/:userId/stories]', error)
    return NextResponse.json({ error: 'Hikâyeler alınamadı' }, { status: 500 })
  }
}
