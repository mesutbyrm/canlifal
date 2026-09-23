import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitChatEvent } from '@/lib/chat-events'
import { resolveUser } from '@/lib/rbac'
import { staffCan } from '@/lib/permissions'
import { PK_RUNNING_STATUSES } from '@/lib/pk-state'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

/** §7: manuel skor müdahalesi üst sınırı */
import { getPkLimits } from '@/lib/pk-state'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/pk/score
 * Update PK battle score. Called internally by gift API (applyGiftPkScore).
 * Direct access restricted to admin/superadmin only (§90 güvenlik düzeltmesi).
 *
 * Body: { battleId?, roomId?, amount, side?: 'room1' | 'room2' }
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    // §90 Fix: Only admin/superadmin can call this directly
    const resolved = await resolveUser(request)
    if (!resolved || !(await staffCan(resolved.role, resolved.id, 'moderation.room.manage', ['admin', 'superadmin']))) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bu işlem için admin yetkisi gerekiyor' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { battleId, roomId, amount, side } = body

    const rawAmount = Number(amount)
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_AMOUNT', message: 'amount gerekli ve pozitif olmalı' } },
        { status: 400 }
      )
    }
    // §7: istemciden gelen puan asla sınırsız olamaz
    const points = Math.min(Math.floor(rawAmount), (await getPkLimits()).maxManualPoints)

    // Find active PK
    let battle
    if (battleId) {
      battle = await prisma.pKBattle.findFirst({ where: { id: battleId, status: { in: PK_RUNNING_STATUSES } } })
    } else if (roomId) {
      battle = await prisma.pKBattle.findFirst({
        where: {
          OR: [{ stream1Id: roomId }, { stream2Id: roomId }],
          status: { in: PK_RUNNING_STATUSES }
        }
      })
    }

    if (!battle) {
      return NextResponse.json(
        { success: false, error: { code: 'PK_NOT_FOUND', message: 'Aktif PK bulunamadı' } },
        { status: 404 }
      )
    }

    // Determine side
    let isRoom1: boolean
    if (side === 'room1' || side === 'challenger') {
      isRoom1 = true
    } else if (side === 'room2' || side === 'opponent') {
      isRoom1 = false
    } else {
      isRoom1 = battle.stream1Id === roomId
    }

    const updated = await prisma.pKBattle.update({
      where: { id: battle.id },
      data: isRoom1
        ? { score1: { increment: points } }
        : { score2: { increment: points } }
    })

    // §7 denetim izi: manuel müdahale defterde kalır
    try {
      await prisma.pkScore.create({
        data: {
          battleId: battle.id,
          side: isRoom1 ? 1 : 2,
          points,
          source: 'manual',
          contributorId: resolved.id,
        },
      })
    } catch (ledgerError) {
      console.error('[LIVE/pk/score] ledger error:', ledgerError)
    }

    // Emit score update
    const scoreData = {
      battleId: battle.id,
      action: 'score_update',
      score1: updated.score1,
      score2: updated.score2,
      room1Id: battle.stream1Id,
      room2Id: battle.stream2Id,
      addedAmount: points,
      addedSide: isRoom1 ? 'room1' : 'room2',
    }
    emitChatEvent(battle.stream1Id, 'pk', scoreData)
    emitChatEvent(battle.stream2Id, 'pk', scoreData)

    recordAudit({ actorId: authUser.id, action: 'pk.score', targetType: 'pk_battle', targetId: updated.id, metadata: { side: isRoom1 ? 1 : 2, points, source: 'manual', score1: updated.score1, score2: updated.score2 }, ip: getAuditIp(request) }).catch(() => {})
    return NextResponse.json({
      success: true,
      data: {
        battleId: updated.id,
        score1: updated.score1,
        score2: updated.score2,
      }
    })
  } catch (error) {
    console.error('[LIVE/pk/score] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Skor güncellenemedi' } },
      { status: 500 }
    )
  }
}
