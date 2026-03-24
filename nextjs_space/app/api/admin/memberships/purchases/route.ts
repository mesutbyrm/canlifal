import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// GET: List all membership purchases with user details
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // active, expired, cancelled, all
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '100')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }
    if (userId) {
      where.userId = userId
    }

    const purchases = await prisma.membershipPurchase.findMany({
      where,
      include: {
        plan: {
          select: {
            name: true,
            tier: true,
            durationDays: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Get user details for all purchases
    const userIds = [...new Set(purchases.map((p: { userId: string }) => p.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        membership: true,
        membershipExpiresAt: true
      }
    })
    const userMap = Object.fromEntries(users.map((u: { id: string }) => [u.id, u]))

    const purchasesWithUsers = purchases.map((p: { userId: string }) => ({
      ...p,
      user: userMap[p.userId] || null
    }))

    // Get statistics
    const stats = await prisma.membershipPurchase.groupBy({
      by: ['status'],
      _count: { id: true }
    })

    const totalRevenue = await prisma.membershipPurchase.aggregate({
      _sum: { pricePaid: true },
      where: { priceType: 'money' }
    })

    const jetonRevenue = await prisma.membershipPurchase.aggregate({
      _sum: { pricePaid: true },
      where: { priceType: 'jeton' }
    })

    return NextResponse.json({
      purchases: purchasesWithUsers,
      stats: {
        byStatus: Object.fromEntries(stats.map((s: { status: string; _count: { id: number } }) => [s.status, s._count.id])),
        totalMoneyRevenue: totalRevenue._sum.pricePaid || 0,
        totalJetonSpent: jetonRevenue._sum.pricePaid || 0
      }
    })
  } catch (error) {
    console.error('Error fetching membership purchases:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// POST: Grant membership to a user
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { userId, planId, durationDays, customTier, freeGrant } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    let plan = null
    let tier = customTier || 'gold'
    let days = durationDays || 30
    let pricePaid = 0
    let priceType = 'jeton'

    if (planId) {
      plan = await prisma.membershipPlan.findUnique({ where: { id: planId } })
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
      }
      tier = plan.tier
      days = plan.durationDays
      if (!freeGrant) {
        pricePaid = plan.price
        priceType = plan.priceType
      }
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    // Create purchase record
    const purchase = await prisma.membershipPurchase.create({
      data: {
        userId,
        planId: planId || 'admin_grant',
        priceType,
        pricePaid,
        startsAt: now,
        expiresAt,
        status: 'active'
      }
    })

    // Update user's membership
    await prisma.user.update({
      where: { id: userId },
      data: {
        membership: tier,
        membershipExpiresAt: expiresAt
      }
    })

    // Add bonus jetons if plan has them and not a free grant
    if (plan && plan.bonusJetons > 0 && !freeGrant) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          jetonBalance: { increment: plan.bonusJetons }
        }
      })
    }

    return NextResponse.json({ success: true, purchase })
  } catch (error) {
    console.error('Error granting membership:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// PATCH: Update membership purchase (extend/cancel)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { purchaseId, action, extendDays } = body

    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID is required' }, { status: 400 })
    }

    const purchase = await prisma.membershipPurchase.findUnique({
      where: { id: purchaseId }
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    if (action === 'cancel') {
      await prisma.membershipPurchase.update({
        where: { id: purchaseId },
        data: { status: 'cancelled' }
      })

      // Reset user membership to basic
      await prisma.user.update({
        where: { id: purchase.userId },
        data: {
          membership: 'basic',
          membershipExpiresAt: null
        }
      })

      return NextResponse.json({ success: true, message: 'Membership cancelled' })
    }

    if (action === 'extend' && extendDays) {
      const currentExpiry = purchase.expiresAt
      const newExpiry = new Date(currentExpiry.getTime() + extendDays * 24 * 60 * 60 * 1000)

      await prisma.membershipPurchase.update({
        where: { id: purchaseId },
        data: {
          expiresAt: newExpiry,
          status: 'active'
        }
      })

      // Update user's membership expiry
      await prisma.user.update({
        where: { id: purchase.userId },
        data: {
          membershipExpiresAt: newExpiry
        }
      })

      return NextResponse.json({ success: true, newExpiry })
    }

    if (action === 'reactivate') {
      const days = extendDays || 30
      const newExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

      await prisma.membershipPurchase.update({
        where: { id: purchaseId },
        data: {
          expiresAt: newExpiry,
          status: 'active'
        }
      })

      // Fetch plan tier
      const plan = await prisma.membershipPlan.findUnique({
        where: { id: purchase.planId }
      })

      await prisma.user.update({
        where: { id: purchase.userId },
        data: {
          membership: plan?.tier || 'gold',
          membershipExpiresAt: newExpiry
        }
      })

      return NextResponse.json({ success: true, newExpiry })
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (error) {
    console.error('Error updating membership:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
