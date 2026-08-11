import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { missionProgressForUser, todayKey } from '@/lib/gift-insights'

export const dynamic = 'force-dynamic'

/**
 * POST /api/gifts/missions/[missionId]/claim
 * Claim the reward of a completed daily mission. Dual-auth (mobile JWT / web session).
 * missionId may be either the mission id or its unique code.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { missionId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(request)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || (webSession?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const key = params.missionId
    const mission = await prisma.giftMission.findFirst({
      where: { OR: [{ id: key }, { code: key }] },
    })
    if (!mission || !mission.isActive) {
      return NextResponse.json({ error: 'Görev bulunamadı' }, { status: 404 })
    }

    const progressList = await missionProgressForUser(userId)
    const current = progressList.find(p => p.id === mission.id)
    if (!current) {
      return NextResponse.json({ error: 'Görev bulunamadı' }, { status: 404 })
    }
    if (!current.completed) {
      return NextResponse.json(
        { error: 'Görev henüz tamamlanmadı', progress: current.progress, target: current.target },
        { status: 400 }
      )
    }
    if (current.claimed) {
      return NextResponse.json({ error: 'Ödül zaten alındı' }, { status: 409 })
    }

    const dayKey = todayKey()
    const rewardJetons = mission.rewardJetons || 0
    const rewardCredits = mission.rewardCredits || 0

    const result = await prisma.$transaction(async (tx) => {
      await tx.userMissionProgress.upsert({
        where: { userId_missionId_dayKey: { userId, missionId: mission.id, dayKey } },
        create: {
          userId,
          missionId: mission.id,
          dayKey,
          progress: current.progress,
          completed: true,
          claimed: true,
        },
        update: { progress: current.progress, completed: true, claimed: true },
      })

      if (rewardJetons > 0 || rewardCredits > 0) {
        return tx.user.update({
          where: { id: userId },
          data: {
            ...(rewardJetons > 0 ? { jetonBalance: { increment: rewardJetons } } : {}),
            ...(rewardCredits > 0 ? { credits: { increment: rewardCredits } } : {}),
          },
          select: { jetonBalance: true, credits: true },
        })
      }
      return tx.user.findUnique({ where: { id: userId }, select: { jetonBalance: true, credits: true } })
    })

    return NextResponse.json({
      success: true,
      missionId: mission.id,
      code: mission.code,
      dayKey,
      claimed: true,
      completed: true,
      progress: current.progress,
      target: current.target,
      rewardJetons,
      rewardCredits,
      reward: current.reward,
      rewardLabel: current.rewardLabel,
      jetonBalance: result?.jetonBalance ?? null,
      credits: result?.credits ?? null,
    })
  } catch (error) {
    console.error('[gifts/missions/claim]', error)
    return NextResponse.json({ error: 'Ödül alınamadı' }, { status: 500 })
  }
}
