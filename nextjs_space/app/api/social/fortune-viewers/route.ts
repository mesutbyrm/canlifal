import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/social/fortune-viewers?type=<fortuneType>&limit=5
 *
 * Sosyal akıştaki fal paylaşım kartı için: bu fal türüne kaç kez
 * baktırıldığı (`count`, /api/social/posts `fortuneCount` ile aynı sayım) ve
 * bu türdeki falını HERKESE AÇIK paylaşan son kullanıcılar (en çok 10).
 * Gizlilik: yalnızca açık paylaşımlardan türetilir; özel fallar listelenmez.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') || '').trim()
    const exclude = (searchParams.get('exclude') || '').trim()
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '5') || 5, 1), 10)
    if (!type || type.length > 64) {
      return NextResponse.json({ success: false, error: 'Fal türü gerekli' }, { status: 400 })
    }

    const [count, posts] = await Promise.all([
      prisma.fortune.count({ where: { fortuneType: type } }),
      prisma.socialPost.findMany({
        where: {
          isPublic: true,
          fortuneType: type,
          ...(exclude ? { userId: { not: exclude } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
        select: {
          userId: true,
          createdAt: true,
          user: { select: { id: true, name: true, image: true } },
        },
      }),
    ])

    const seen = new Set<string>()
    const users: { id: string; name: string | null; image: string | null; sharedAt: Date }[] = []
    for (const p of posts) {
      if (!p.user || seen.has(p.userId)) continue
      seen.add(p.userId)
      users.push({ id: p.user.id, name: p.user.name, image: p.user.image, sharedAt: p.createdAt })
      if (users.length >= limit) break
    }

    return NextResponse.json(
      { success: true, data: { fortuneType: type, count, users } },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch (error) {
    console.error('Fortune viewers fetch error:', error)
    return NextResponse.json({ success: false, error: 'Liste alınamadı' }, { status: 500 })
  }
}
