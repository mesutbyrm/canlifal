import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { planId, paymentMethod } = await req.json()
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }
    // paymentMethod: 'jeton' or 'cfc' — defaults to 'jeton'
    const method = paymentMethod === 'cfc' ? 'cfc' : 'jeton'

    // Get the plan
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId, isActive: true }
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { jetonBalance: true, credits: true, membership: true, membershipExpiresAt: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const isStaff = user.role === 'admin' || user.role === 'yonetici'

    // Allow payment with jeton or CFC (staff skip payment)
    if (!isStaff) {
      if (method === 'cfc') {
        if (user.credits < plan.price) {
          return NextResponse.json({ error: 'Yetersiz CFC bakiyesi' }, { status: 400 })
        }
        await prisma.user.update({
          where: { id: session.user.id },
          data: { credits: { decrement: plan.price } }
        })
      } else {
        if (user.jetonBalance < plan.price) {
          return NextResponse.json({ error: 'Yetersiz jeton bakiyesi' }, { status: 400 })
        }
        await prisma.user.update({
          where: { id: session.user.id },
          data: { jetonBalance: { decrement: plan.price } }
        })
        await prisma.jetonTransaction.create({
          data: {
            userId: session.user.id,
            amount: -plan.price,
            type: 'spend',
            description: `${plan.name} üyelik satın alındı`,
            balanceBefore: user.jetonBalance,
            balanceAfter: user.jetonBalance - plan.price
          }
        })
      }
    }

    // Calculate expiration date
    const now = new Date()
    let startsAt = now
    
    // If user already has an active membership of same or higher tier, extend it
    if (user.membershipExpiresAt && user.membershipExpiresAt > now) {
      startsAt = user.membershipExpiresAt
    }
    
    const expiresAt = new Date(startsAt)
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays)

    // Create purchase record
    await prisma.membershipPurchase.create({
      data: {
        userId: session.user.id,
        planId: plan.id,
        priceType: plan.priceType,
        pricePaid: plan.price,
        currency: plan.currency,
        startsAt,
        expiresAt,
        status: 'active'
      }
    })

    // Update user membership
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        membership: plan.tier,
        membershipExpiresAt: expiresAt
      }
    })

    // Add bonus jetons if any
    if (plan.bonusJetons > 0) {
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { jetonBalance: { increment: plan.bonusJetons } },
        select: { jetonBalance: true }
      })

      await prisma.jetonTransaction.create({
        data: {
          userId: session.user.id,
          amount: plan.bonusJetons,
          type: 'purchase',
          description: `${plan.name} üyelik bonus jetonları`,
          balanceBefore: updatedUser.jetonBalance - plan.bonusJetons,
          balanceAfter: updatedUser.jetonBalance
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `${plan.name} üyeliğiniz aktifleştirildi!`,
      membership: plan.tier,
      expiresAt: expiresAt.toISOString()
    })
  } catch (error) {
    console.error('Membership purchase error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
