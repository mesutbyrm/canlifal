import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get current user's agency info
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Check if user is member of an agency
    const membership = await prisma.agencyUser.findUnique({
      where: { userId: session.user.id },
      include: {
        agency: {
          include: {
            _count: { select: { members: true, earnings: true } },
          }
        }
      }
    })

    // Check if user owns an agency (even if not a member)
    const ownedAgency = await prisma.agency.findFirst({
      where: { ownerId: session.user.id },
      include: {
        _count: { select: { members: true, earnings: true, inviteCodes: true } },
      }
    })

    // Check pending leave request
    const pendingLeaveRequest = await prisma.agencyLeaveRequest.findFirst({
      where: { userId: session.user.id, status: 'pending' },
    })

    return NextResponse.json({
      membership: membership ? {
        id: membership.id,
        role: membership.role,
        totalEarnings: membership.totalEarnings,
        joinedAt: membership.joinedAt,
        agency: membership.agency,
      } : null,
      ownedAgency: ownedAgency || null,
      isOwner: !!ownedAgency && ownedAgency.status === 'approved',
      pendingLeaveRequest: pendingLeaveRequest || null,
    })
  } catch (error: any) {
    console.error('[Agency My] Error:', error)
    return NextResponse.json({ error: 'Bilgi alınamadı' }, { status: 500 })
  }
}

// PATCH: Update agency name (owner only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description } = body

    // Find owned agency
    const agency = await prisma.agency.findFirst({
      where: { ownerId: session.user.id, status: 'approved' },
    })

    if (!agency) {
      return NextResponse.json({ error: 'Ajans bulunamadı veya yetkiniz yok' }, { status: 403 })
    }

    const updateData: any = {}
    if (name && typeof name === 'string' && name.trim().length >= 2) {
      // Check uniqueness
      const existing = await prisma.agency.findFirst({
        where: { name: name.trim(), id: { not: agency.id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Bu ajans ismi zaten kullanımda' }, { status: 409 })
      }
      updateData.name = name.trim()
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Değiştirilecek bir bilgi belirtilmedi' }, { status: 400 })
    }

    const updated = await prisma.agency.update({
      where: { id: agency.id },
      data: updateData,
    })

    return NextResponse.json({ success: true, agency: updated })
  } catch (error: any) {
    console.error('[Agency My PATCH] Error:', error)
    return NextResponse.json({ error: 'Güncelleme sırasında hata oluştu' }, { status: 500 })
  }
}
