export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getUserPermissions } from '@/lib/chat-permissions'
import { listModerationActions } from '@/lib/girlive-bot'

/**
 * GET /api/chat/rooms/{roomId}/moderation/violations
 * Moderatör paneli "Cezalar → Uyarılar": GirLive Bot'un bu odada uyguladığı
 * uyarı / mute / kick / ban kayıtları. Yalnızca oda moderatörleri.
 */
export async function GET(request: NextRequest, { params }: { params: { roomId: string } }) {
  const authUser = await authenticateRequest(request)
  if (!authUser) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  const perms = await getUserPermissions(params.roomId, authUser.id)
  if (!perms.canMuteUsers && !perms.canBanUsers && !perms.canKickUsers && !perms.isGlobalAdmin) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }
  const rows = await listModerationActions('voice_room', params.roomId, 50)
  return NextResponse.json({
    success: true,
    violations: rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      user: r.user,
      severity: r.severity,
      action: r.action,
      word: r.matchedWord,
      excerpt: r.messageExcerpt,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    })),
  })
}
