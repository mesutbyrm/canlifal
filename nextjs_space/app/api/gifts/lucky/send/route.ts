import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { isExcludedFromFinance } from '@/lib/admin-check'
import { guardRateLimit } from '@/lib/rate-limit-guard'

export const dynamic = 'force-dynamic'

// Weighted random pick from active tiers
function pickTier(tiers: { id: string; multiplier: number; weight: number; isJackpot: boolean; name: string; nameEn: string; color: string | null; icon: string | null }[]) {
  const total = tiers.reduce((s, t) => s + Math.max(0, t.weight || 0), 0)
  if (total <= 0) return tiers[0]
  let r = Math.random() * total
  for (const t of tiers) {
    r -= Math.max(0, t.weight || 0)
    if (r < 0) return t
  }
  return tiers[tiers.length - 1]
}

/**
 * POST /api/gifts/lucky/send
 * Body: { giftTypeId, quantity?, context?, contextId? }
 * Sends a lucky gift: deducts the bet from CFC, rolls a weighted reward tier,
 * credits winnings, logs the outcome, and triggers a jackpot announcement.
 * Dual-auth (web session or mobile JWT).
 */
export async function POST(request: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(request)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || (webSession?.user as any)?.id
    const userName = mobileUser?.name || webSession?.user?.name || 'Kullanıcı'

    // Rate limit: şanslı hediye
    const rateLimited = await guardRateLimit(request, 'lucky_gift', { userId })
    if (rateLimited) return rateLimited

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const giftTypeId = body.giftTypeId as string
    const quantity = Math.max(1, Math.min(99, parseInt(body.quantity) || 1))
    const context = body.context ? String(body.context) : null
    const contextId = body.contextId ? String(body.contextId) : null

    if (!giftTypeId) {
      return NextResponse.json({ error: 'giftTypeId gerekli' }, { status: 400 })
    }

    const giftType = await prisma.giftType.findUnique({ where: { id: giftTypeId } })
    if (!giftType || !giftType.isActive) {
      return NextResponse.json({ error: 'Geçersiz hediye' }, { status: 400 })
    }
    if (!giftType.isLucky) {
      return NextResponse.json({ error: 'Bu hediye şanslı hediye değil' }, { status: 400 })
    }

    const tiers = await prisma.luckyGiftTier.findMany({ where: { isActive: true } })
    if (tiers.length === 0) {
      return NextResponse.json({ error: 'Şanslı hediye henüz yapılandırılmamış' }, { status: 503 })
    }

    // KURAL: Şanslı hediye tamamen CFC ile çalışır (bahis CFC, kazanç CFC).
    // Jeton paraya çevrilebildiği için ne bahis alınır ne de ödül olarak verilir.
    const betJetons = giftType.price * quantity

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true, role: true },
    })
    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

    const excluded = await isExcludedFromFinance(userId)

    if (!excluded && (user.credits ?? 0) < betJetons) {
      return NextResponse.json({ error: 'Yetersiz CFC bakiyesi' }, { status: 400 })
    }

    // Roll the reward
    const tier = pickTier(tiers as any)
    const multiplier = tier.multiplier
    const wonJetons = betJetons * multiplier
    const netJetons = wonJetons - betJetons

    const balanceBefore = user.credits ?? 0
    const balanceAfter = excluded ? balanceBefore : balanceBefore - betJetons + wonJetons

    const ops: any[] = [
      prisma.luckyGiftReward.create({
        data: {
          userId,
          giftTypeId,
          context,
          contextId,
          betJetons,
          quantity,
          multiplier,
          wonJetons,
          netJetons,
          isJackpot: tier.isJackpot,
          tierId: tier.id,
        },
      }),
    ]

    if (!excluded) {
      ops.push(
        prisma.user.update({
          where: { id: userId },
          data: {
            // net = kazanç - bahis (tek alan, tek işlem)
            credits: { increment: netJetons },
          },
        }),
        prisma.creditTransaction.create({
          data: {
            userId,
            amount: -betJetons,
            type: 'lucky_gift_bet',
            description: `Şanslı hediye bahsi (CFC): ${giftType.name} x${quantity}`,
            balance: balanceBefore - betJetons,
          },
        }),
      )
      if (wonJetons > 0) {
        ops.push(
          prisma.creditTransaction.create({
            data: {
              userId,
              amount: wonJetons,
              type: 'lucky_gift_win',
              description: `Şanslı hediye kazancı (${multiplier}x): ${giftType.name} → CFC`,
              balance: balanceAfter,
            },
          }),
        )
      }
    }

    // Jackpot → site-wide scrolling announcement
    if (tier.isJackpot && wonJetons > 0 && !excluded) {
      ops.push(
        prisma.siteAnnouncement.create({
          data: {
            type: 'lucky_jackpot',
            message: `🍰 ${userName} Şanslı Hediye JACKPOT! ${giftType.icon} ${giftType.name} → ${multiplier}x = ${wonJetons.toLocaleString('tr-TR')} CFC! 🎉`,
            color: 'gift',
            maxPasses: 2,
            expiresAt: new Date(Date.now() + 3 * 60 * 1000),
          },
        }),
      )
    }

    const [reward] = await prisma.$transaction(ops)

    return NextResponse.json({
      success: true,
      rewardId: reward.id,
      result: {
        tierId: tier.id,
        tierName: tier.name,
        multiplier,
        betJetons,
        wonJetons,
        netJetons,
        isJackpot: tier.isJackpot,
        color: tier.color,
        icon: tier.icon,
        isWin: multiplier >= 1,
      },
      currency: 'cfc',
      newBalance: balanceAfter,
    })
  } catch (e) {
    console.error('[lucky/send] error', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
