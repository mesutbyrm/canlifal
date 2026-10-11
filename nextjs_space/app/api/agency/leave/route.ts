import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { recordMembershipLeave } from '@/lib/agency-membership-history'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// POST: Submit leave request (member) or approve/reject leave request (owner/manager)
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { action, requestId, reviewNote, reason } = body

    // If action is approve/reject, handle as owner/manager
    if (action === 'approve' || action === 'reject') {
      const myMembership = await prisma.agencyUser.findUnique({
        where: { userId: authUser.id },
      })
      if (!myMembership || !['owner', 'manager'].includes(myMembership.role)) {
        return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      }

      const leaveReq = await prisma.agencyLeaveRequest.findUnique({
        where: { id: requestId },
      })
      if (!leaveReq || leaveReq.agencyId !== myMembership.agencyId || leaveReq.status !== 'pending') {
        return NextResponse.json({ error: 'Talep bulunamadı veya zaten işlenmiş' }, { status: 404 })
      }

      if (action === 'approve') {
        // Approve: remove the member and update the request
        const targetMember = await prisma.agencyUser.findUnique({
          where: { userId: leaveReq.userId },
        })

        await prisma.agencyLeaveRequest.update({
          where: { id: requestId },
          data: { status: 'approved', reviewedBy: authUser.id, reviewNote: reviewNote || null, reviewedAt: new Date() },
        })

        if (targetMember && targetMember.agencyId === myMembership.agencyId) {
          await prisma.agencyUser.delete({ where: { id: targetMember.id } })
          await recordMembershipLeave({ agencyId: targetMember.agencyId, userId: targetMember.userId, endedBy: 'user', reason: leaveReq.reason ?? null, actorId: authUser.id, joinedAt: targetMember.joinedAt, role: targetMember.role })
          await prisma.agency.update({
            where: { id: myMembership.agencyId },
            data: {
              totalMembers: { decrement: 1 },
              activeMembers: targetMember.isActive ? { decrement: 1 } : undefined,
            },
          })
        }

        return NextResponse.json({ success: true, message: 'Çıkış talebi onaylandı, üye ayrıldı' })
      } else {
        // Reject
        await prisma.agencyLeaveRequest.update({
          where: { id: requestId },
          data: { status: 'rejected', reviewedBy: authUser.id, reviewNote: reviewNote || null, reviewedAt: new Date() },
        })
        return NextResponse.json({ success: true, message: 'Çıkış talebi reddedildi' })
      }
    }

    // Otherwise, submit a new leave request
    const membership = await prisma.agencyUser.findUnique({
      where: { userId: authUser.id },
      include: { agency: { select: { id: true, ownerId: true } } }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Herhangi bir ajansa üye değilsiniz' }, { status: 400 })
    }

    if (membership.agency.ownerId === authUser.id) {
      return NextResponse.json({ error: 'Ajans sahibi olarak çıkış talebi gönderemezsiniz.' }, { status: 400 })
    }

    // Check existing pending request
    const existingReq = await prisma.agencyLeaveRequest.findFirst({
      where: { userId: authUser.id, agencyId: membership.agencyId, status: 'pending' },
    })
    if (existingReq) {
      return NextResponse.json({ error: 'Zaten bekleyen bir çıkış talebiniz var' }, { status: 409 })
    }

    await prisma.agencyLeaveRequest.create({
      data: {
        agencyId: membership.agencyId,
        userId: authUser.id,
        reason: reason || null,
      }
    })

    return NextResponse.json({ success: true, message: 'Çıkış talebiniz gönderildi. Ajans yönetimi onaylayınca ayrılacaksınız.' })
  } catch (error: any) {
    console.error('[Agency Leave] Error:', error)
    return NextResponse.json({ error: 'İşlem sırasında hata oluştu' }, { status: 500 })
  }
}

// DELETE: Cancel own pending leave request
export async function DELETE(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const pending = await prisma.agencyLeaveRequest.findFirst({
      where: { userId: authUser.id, status: 'pending' },
    })
    if (!pending) {
      return NextResponse.json({ error: 'Bekleyen talep bulunamadı' }, { status: 404 })
    }

    await prisma.agencyLeaveRequest.delete({ where: { id: pending.id } })

    return NextResponse.json({ success: true, message: 'Çıkış talebi iptal edildi' })
  } catch (error: any) {
    console.error('[Agency Leave DELETE] Error:', error)
    return NextResponse.json({ error: 'İptal sırasında hata oluştu' }, { status: 500 })
  }
}
