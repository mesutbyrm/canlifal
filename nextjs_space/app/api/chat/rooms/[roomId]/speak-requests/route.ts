import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { canModerateSpeakRequests, serializeSpeakRequest } from '@/lib/speak-requests'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/rooms/{roomId}/speak-requests?status=pending
 * Oda sahibi / admin / ses yetkisi verebilen roller için istek kuyruğu.
 * SSE `voice_request` popup'ı ile aynı kaynağı kullanır (tutarlılık).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const currentUserId = mobileUser?.id || session?.user?.id
    if (!currentUserId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const { canHandle } = await canModerateSpeakRequests(roomId, currentUserId)
    if (!canHandle) {
      return NextResponse.json({ error: 'Konuşma isteklerini görüntüleme yetkiniz yok' }, { status: 403 })
    }

    const statusParam = request.nextUrl.searchParams.get('status') || 'pending'
    const where: any = { roomId }
    if (statusParam !== 'all') where.status = statusParam

    const requests = await prisma.chatSpeakRequest.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 100
    })

    const userIds = Array.from(new Set(requests.map((r: any) => r.userId)))
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, image: true }
        })
      : []
    const userMap = new Map(users.map((u: any) => [u.id, u]))

    const items = requests.map((r: any) => serializeSpeakRequest(r, userMap.get(r.userId) as any))

    return NextResponse.json({ requests: items, count: items.length })
  } catch (error) {
    console.error('[speak-requests] GET error:', error)
    return NextResponse.json({ error: 'Konuşma istekleri alınamadı' }, { status: 500 })
  }
}
