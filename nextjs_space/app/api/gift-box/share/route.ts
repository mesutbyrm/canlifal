export const dynamic = 'force-dynamic'

/**
 * POST /api/gift-box/share — "Yayını paylaş" görevi için doğrulanabilir olay (§11-C).
 * Body: { scope: 'stream'|'room', targetId, channel? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { guardRateLimit } from '@/lib/rate-limit-guard'

export async function POST(req: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(req)
    const session = mobileUser?.id ? null : await getServerSession(authOptions)
    const userId = mobileUser?.id || session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Oturum açmanız gerekiyor', code: 'UNAUTHORIZED' }, { status: 401 })

    const limited = await guardRateLimit(req, 'gift_box_join', { userId })
    if (limited) return limited

    const body = await req.json().catch(() => ({}))
    const scope = String(body?.scope || '')
    const targetId = String(body?.targetId || '')
    const channel = String(body?.channel || 'link').slice(0, 32)
    if (!['stream', 'room'].includes(scope) || !targetId) {
      return NextResponse.json({ error: 'Geçersiz istek', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    // Hedefin gerçekten var olduğunu doğrula — uydurma paylaşım kaydı oluşturulamasın.
    if (scope === 'stream') {
      const s = await prisma.videoStream.findUnique({ where: { id: targetId }, select: { id: true } })
      if (!s) return NextResponse.json({ error: 'Yayın bulunamadı', code: 'STREAM_NOT_FOUND' }, { status: 404 })
    } else {
      const r = await prisma.chatRoom.findUnique({ where: { id: targetId }, select: { id: true } })
      if (!r) return NextResponse.json({ error: 'Oda bulunamadı', code: 'ROOM_NOT_FOUND' }, { status: 404 })
    }

    const ev = await prisma.shareEvent.create({ data: { userId, scope, targetId, channel } })
    return NextResponse.json({ success: true, shareId: ev.id })
  } catch (err) {
    console.error('[gift-box][share]', err)
    return NextResponse.json({ error: 'Beklenmeyen bir hata oluştu', code: 'VALIDATION_ERROR' }, { status: 500 })
  }
}
