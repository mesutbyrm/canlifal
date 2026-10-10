import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { BLOCKED_MESSAGE, isBlockedByAgency } from '@/lib/agency-access'
import { recordMembershipJoin } from '@/lib/agency-membership-history'
import { authenticateRequest } from '@/lib/mobile-auth'
import { createNotificationWithPush } from '@/lib/notify'

export const dynamic = 'force-dynamic'

// GET: Giriş yapan kullanıcının bekleyen ajans davetleri
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const invites = await prisma.agencyMemberInvite.findMany({
      where: { userId: authUser.id, status: 'pending' },
      include: {
        agency: { select: { id: true, name: true, logoUrl: true, level: true, commissionRate: true } },
        invitedBy: { select: { id: true, name: true, username: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invites })
  } catch (error: any) {
    console.error('[Agency Invites GET] Error:', error)
    return NextResponse.json({ error: 'Davetler alınamadı' }, { status: 500 })
  }
}

// POST: Daveti kabul et veya reddet. Body: { inviteId, action: 'accept' | 'reject' }
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { inviteId, action } = body

    if (!inviteId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
    }

    const invite = await prisma.agencyMemberInvite.findUnique({
      where: { id: inviteId },
      include: { agency: { select: { id: true, name: true, status: true, invitesDisabled: true, ownerId: true } } },
    })

    if (!invite || invite.userId !== authUser.id) {
      return NextResponse.json({ error: 'Davet bulunamadı' }, { status: 404 })
    }
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Bu davet artık geçerli değil' }, { status: 409 })
    }

    // REDDET
    if (action === 'reject') {
      await prisma.agencyMemberInvite.update({
        where: { id: inviteId },
        data: { status: 'rejected', respondedAt: new Date() },
      })
      await createNotificationWithPush({
        userId: invite.invitedById,
        type: 'agency_invite_rejected',
        title: 'Davet Reddedildi',
        message: `Bir kullanıcı ${invite.agency.name} ajansına katılma davetini reddetti.`,
        fromUserId: authUser.id,
        targetPath: '/ajans-paneli',
      }).catch(() => {})
      return NextResponse.json({ success: true, message: 'Davet reddedildi' })
    }

    // KABUL ET
    if (await isBlockedByAgency(invite.agencyId, authUser.id)) {
      return NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 403 })
    }
    if (invite.agency.status !== 'approved') {
      return NextResponse.json({ error: 'Ajans artık davet kabul edemiyor' }, { status: 403 })
    }

    // Kullanıcı başka bir ajansa üye mi?
    const existingMembership = await prisma.agencyUser.findUnique({
      where: { userId: authUser.id },
    })
    if (existingMembership) {
      return NextResponse.json({ error: 'Zaten bir ajansa üyesiniz' }, { status: 409 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.agencyUser.create({
        data: {
          agencyId: invite.agencyId,
          userId: authUser.id,
          role: 'member',
          joinedVia: 'invite',
          isActive: true,
        },
      })
      await tx.agency.update({
        where: { id: invite.agencyId },
        data: {
          totalMembers: { increment: 1 },
          activeMembers: { increment: 1 },
        },
      })
      await tx.agencyMemberInvite.update({
        where: { id: inviteId },
        data: { status: 'accepted', respondedAt: new Date() },
      })
      // Aynı kullanıcıya açık diğer davetleri iptal et
      await tx.agencyMemberInvite.updateMany({
        where: { userId: authUser.id, status: 'pending', id: { not: inviteId } },
        data: { status: 'cancelled', respondedAt: new Date() },
      })
    })
    await recordMembershipJoin({ agencyId: invite.agencyId, userId: authUser.id, role: 'member', via: 'invite', actorId: invite.invitedById })

    await createNotificationWithPush({
      userId: invite.invitedById,
      type: 'agency_invite_accepted',
      title: 'Davet Kabul Edildi',
      message: `Bir kullanıcı ${invite.agency.name} ajansına katıldı.`,
      fromUserId: authUser.id,
      targetPath: '/ajans-paneli',
    }).catch(() => {})

    return NextResponse.json({ success: true, message: `${invite.agency.name} ajansına katıldınız` })
  } catch (error: any) {
    console.error('[Agency Invites POST] Error:', error)
    return NextResponse.json({ error: 'Davet işlenirken hata oluştu' }, { status: 500 })
  }
}

// DELETE: Ajans daveti iptal et (owner/manager). ?inviteId=
export async function DELETE(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const membership = await prisma.agencyUser.findUnique({
      where: { userId: authUser.id },
    })
    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const inviteId = searchParams.get('inviteId')
    if (!inviteId) {
      return NextResponse.json({ error: 'Davet ID gerekli' }, { status: 400 })
    }

    const invite = await prisma.agencyMemberInvite.findUnique({ where: { id: inviteId } })
    if (!invite || invite.agencyId !== membership.agencyId) {
      return NextResponse.json({ error: 'Davet bulunamadı' }, { status: 404 })
    }
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Bu davet artık iptal edilemez' }, { status: 409 })
    }

    await prisma.agencyMemberInvite.update({
      where: { id: inviteId },
      data: { status: 'cancelled', respondedAt: new Date() },
    })

    return NextResponse.json({ success: true, message: 'Davet iptal edildi' })
  } catch (error: any) {
    console.error('[Agency Invites DELETE] Error:', error)
    return NextResponse.json({ error: 'Davet iptal edilirken hata oluştu' }, { status: 500 })
  }
}
