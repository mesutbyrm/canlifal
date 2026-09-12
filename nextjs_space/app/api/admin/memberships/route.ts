import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

// GET: List all membership plans for admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'finance.report.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const plans = await prisma.membershipPlan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { purchases: true } }
      }
    })

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Error fetching membership plans:', error)
    return NextResponse.json([], { status: 500 })
  }
}

// POST: Create a new membership plan
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'finance.report.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      nameEn,
      description,
      descriptionEn,
      tier,
      durationDays,
      priceType,
      price,
      currency,
      features,
      bonusJetons,
      discountPercent,
      prioritySupport,
      exclusiveBadge,
      sortOrder,
      isActive,
      isFeatured
    } = body

    if (!name || !tier || !durationDays || !priceType || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        name,
        nameEn: nameEn || null,
        description: description || null,
        descriptionEn: descriptionEn || null,
        tier,
        durationDays: parseInt(durationDays),
        priceType,
        price: parseInt(price),
        currency: currency || 'TRY',
        features: features || null,
        bonusJetons: parseInt(bonusJetons) || 0,
        discountPercent: parseInt(discountPercent) || 0,
        prioritySupport: prioritySupport || false,
        exclusiveBadge: exclusiveBadge || null,
        sortOrder: parseInt(sortOrder) || 0,
        isActive: isActive !== false,
        isFeatured: isFeatured || false
      }
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error creating membership plan:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// PUT: Update a membership plan
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'finance.report.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    // Clean up the data
    const cleanData: Record<string, unknown> = {}
    if (updateData.name !== undefined) cleanData.name = updateData.name
    if (updateData.nameEn !== undefined) cleanData.nameEn = updateData.nameEn || null
    if (updateData.description !== undefined) cleanData.description = updateData.description || null
    if (updateData.descriptionEn !== undefined) cleanData.descriptionEn = updateData.descriptionEn || null
    if (updateData.tier !== undefined) cleanData.tier = updateData.tier
    if (updateData.durationDays !== undefined) cleanData.durationDays = parseInt(updateData.durationDays)
    if (updateData.priceType !== undefined) cleanData.priceType = updateData.priceType
    if (updateData.price !== undefined) cleanData.price = parseInt(updateData.price)
    if (updateData.currency !== undefined) cleanData.currency = updateData.currency
    if (updateData.features !== undefined) cleanData.features = updateData.features || null
    if (updateData.bonusJetons !== undefined) cleanData.bonusJetons = parseInt(updateData.bonusJetons) || 0
    if (updateData.discountPercent !== undefined) cleanData.discountPercent = parseInt(updateData.discountPercent) || 0
    if (updateData.prioritySupport !== undefined) cleanData.prioritySupport = updateData.prioritySupport
    if (updateData.exclusiveBadge !== undefined) cleanData.exclusiveBadge = updateData.exclusiveBadge || null
    if (updateData.sortOrder !== undefined) cleanData.sortOrder = parseInt(updateData.sortOrder) || 0
    if (updateData.isActive !== undefined) cleanData.isActive = updateData.isActive
    if (updateData.isFeatured !== undefined) cleanData.isFeatured = updateData.isFeatured

    const plan = await prisma.membershipPlan.update({
      where: { id },
      data: cleanData
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error updating membership plan:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// DELETE: Delete a membership plan
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'finance.report.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    // Check if there are any purchases
    const purchaseCount = await prisma.membershipPurchase.count({
      where: { planId: id }
    })

    if (purchaseCount > 0) {
      // Soft delete by setting isActive to false
      await prisma.membershipPlan.update({
        where: { id },
        data: { isActive: false }
      })
      return NextResponse.json({ success: true, softDeleted: true })
    }

    await prisma.membershipPlan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting membership plan:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
