import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator']

// GET: List all agencies
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !ADMIN_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const status = req.nextUrl.searchParams.get('status') || undefined
    const search = req.nextUrl.searchParams.get('search') || undefined

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const agencies = await prisma.agency.findMany({
      where,
      include: {
        _count: { select: { members: true, earnings: true, inviteCodes: true, penalties: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ agencies })
  } catch (error: any) {
    console.error('[Admin Agencies GET] Error:', error)
    return NextResponse.json({ error: 'Ajanslar alınamadı' }, { status: 500 })
  }
}

// PATCH: Update agency (approve, reject, suspend, update commission, penalty)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !ADMIN_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const { agencyId, action, ...data } = body

    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID gerekli' }, { status: 400 })
    }

    const agency = await prisma.agency.findUnique({ where: { id: agencyId } })
    if (!agency) {
      return NextResponse.json({ error: 'Ajans bulunamadı' }, { status: 404 })
    }

    if (action === 'approve') {
      await prisma.agency.update({
        where: { id: agencyId },
        data: { status: 'approved', approvedAt: new Date() }
      })
      // Add owner as member
      const existingMembership = await prisma.agencyUser.findUnique({
        where: { userId: agency.ownerId }
      })
      if (!existingMembership) {
        await prisma.agencyUser.create({
          data: {
            agencyId,
            userId: agency.ownerId,
            role: 'owner',
            joinedVia: 'direct',
          }
        })
        await prisma.agency.update({
          where: { id: agencyId },
          data: { totalMembers: 1, activeMembers: 1 }
        })
      }
      return NextResponse.json({ success: true, message: 'Ajans onaylandı' })
    }

    if (action === 'reject') {
      await prisma.agency.update({
        where: { id: agencyId },
        data: { status: 'rejected', rejectedAt: new Date(), rejectedReason: data.reason || null }
      })
      return NextResponse.json({ success: true, message: 'Ajans reddedildi' })
    }

    if (action === 'suspend') {
      await prisma.agency.update({
        where: { id: agencyId },
        data: { status: 'suspended', suspendedAt: new Date(), penaltyLevel: 4 }
      })
      // Record penalty
      await prisma.agencyPenalty.create({
        data: {
          agencyId,
          level: 4,
          reason: data.reason || 'Admin tarafından askıya alındı',
          appliedBy: session.user.id,
        }
      })
      return NextResponse.json({ success: true, message: 'Ajans askıya alındı' })
    }

    if (action === 'reactivate') {
      await prisma.agency.update({
        where: { id: agencyId },
        data: { status: 'approved', penaltyLevel: 0, invitesDisabled: false, suspendedAt: null, penaltyNote: null }
      })
      // Resolve all active penalties
      await prisma.agencyPenalty.updateMany({
        where: { agencyId, isActive: true },
        data: { isActive: false, resolvedAt: new Date(), resolvedBy: session.user.id, resolvedNote: 'Admin tarafından yeniden aktif edildi' }
      })
      return NextResponse.json({ success: true, message: 'Ajans yeniden aktif edildi' })
    }

    if (action === 'penalty') {
      const level = data.penaltyLevel || 1
      const updateData: any = { penaltyLevel: level, penaltyNote: data.reason }
      if (level >= 2) updateData.invitesDisabled = true
      if (level >= 4) updateData.status = 'suspended'

      await prisma.agency.update({ where: { id: agencyId }, data: updateData })
      await prisma.agencyPenalty.create({
        data: {
          agencyId,
          level,
          reason: data.reason || `Seviye ${level} ceza uygulandı`,
          appliedBy: session.user.id,
        }
      })
      return NextResponse.json({ success: true, message: `Seviye ${level} ceza uygulandı` })
    }

    if (action === 'update') {
      const updateData: any = {}
      if (data.commissionRate !== undefined) updateData.commissionRate = parseFloat(data.commissionRate)
      if (data.name) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description

      await prisma.agency.update({ where: { id: agencyId }, data: updateData })
      return NextResponse.json({ success: true, message: 'Ajans güncellendi' })
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (error: any) {
    console.error('[Admin Agencies PATCH] Error:', error)
    return NextResponse.json({ error: 'İşlem sırasında hata oluştu' }, { status: 500 })
  }
}

// DELETE: Delete agency
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !ADMIN_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const { agencyId } = await req.json()
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID gerekli' }, { status: 400 })
    }

    await prisma.agency.delete({ where: { id: agencyId } })
    return NextResponse.json({ success: true, message: 'Ajans silindi' })
  } catch (error: any) {
    console.error('[Admin Agencies DELETE] Error:', error)
    return NextResponse.json({ error: 'Silme sırasında hata oluştu' }, { status: 500 })
  }
}
