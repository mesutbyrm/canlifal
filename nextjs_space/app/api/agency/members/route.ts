import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { isCursorMode, parseCursorParams, fetchCursorPage } from '@/lib/pagination'
import { apiPaginated } from '@/lib/api-response'
import { createNotificationWithPush } from '@/lib/notify'
import { processExpiredLeaveRequests } from '@/lib/agency-auto-leave'

export const dynamic = 'force-dynamic'

const MEMBER_INCLUDE = {
  user: {
    select: { id: true, name: true, username: true, image: true, createdAt: true, lastActiveAt: true },
  },
} as const

export async function GET(req: NextRequest) {
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

    // Faz 19 — opt-in imleç modu (?cursor= veya ?paginate=cursor).
    // Eski çağrılar (parametresiz) bit düzeyinde aynı gövdeyi almaya devam eder.
    if (isCursorMode(req)) {
      const cp = parseCursorParams(req, 30, 100)
      const { items, meta } = await fetchCursorPage(
        (args) => prisma.agencyUser.findMany(args),
        cp.cursor,
        cp.limit,
        {
          where: { agencyId: membership.agencyId },
          include: MEMBER_INCLUDE,
          orderBy: { joinedAt: 'desc' },
        }
      )
      const total = await prisma.agencyUser.count({ where: { agencyId: membership.agencyId } })
      return apiPaginated(items, { ...meta, total })
    }

    const members = await prisma.agencyUser.findMany({
      where: { agencyId: membership.agencyId },
      include: MEMBER_INCLUDE,
      orderBy: { joinedAt: 'desc' },
    })

    // 3 günden eski bekleyen çıkış taleplerini otomatik onayla (tembel tetikleme)
    await processExpiredLeaveRequests(membership.agencyId)

    // Also get pending leave requests
    const leaveRequests = await prisma.agencyLeaveRequest.findMany({
      where: { agencyId: membership.agencyId, status: 'pending' },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } }
      },
      orderBy: { createdAt: 'desc' },
    })

    // Bekleyen üye davetleri (davetsiz ekleme engeli)
    const pendingInvites = await prisma.agencyMemberInvite.findMany({
      where: { agencyId: membership.agencyId, status: 'pending' },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } }
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ members, leaveRequests, pendingInvites })
  } catch (error: any) {
    console.error('[Agency Members] Error:', error)
    return NextResponse.json({ error: 'Üyeler alınamadı' }, { status: 500 })
  }
}

// POST: Üyeyi kullanıcı adıyla DAVET ET (owner/manager). Davetsiz ekleme YOK —
// kullanıcı daveti kabul edene kadar ajansa eklenmez.
export async function POST(req: NextRequest) {
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

    // Ajans davet gönderebilir durumda mı?
    const agency = await prisma.agency.findUnique({
      where: { id: membership.agencyId },
      select: { id: true, name: true, status: true, invitesDisabled: true },
    })
    if (!agency) {
      return NextResponse.json({ error: 'Ajans bulunamadı' }, { status: 404 })
    }
    if (agency.status !== 'approved') {
      return NextResponse.json({ error: 'Ajansınız henüz onaylı değil' }, { status: 403 })
    }
    if (agency.invitesDisabled) {
      return NextResponse.json({ error: 'Ajansınızın davet yetkisi askıya alınmış' }, { status: 403 })
    }

    const body = await req.json()
    const { username } = body

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Kullanıcı adı gerekli' }, { status: 400 })
    }

    // Find user by username
    const targetUser = await prisma.user.findFirst({
      where: { username: username.trim() },
      select: { id: true, name: true, username: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    if (targetUser.id === authUser.id) {
      return NextResponse.json({ error: 'Kendinizi davet edemezsiniz' }, { status: 400 })
    }

    // Check if already in an agency
    const existingMembership = await prisma.agencyUser.findUnique({
      where: { userId: targetUser.id },
    })
    if (existingMembership) {
      return NextResponse.json({ error: 'Bu kullanıcı zaten bir ajansa üye' }, { status: 409 })
    }

    // Zaten bekleyen bir davet var mı?
    const existingInvite = await prisma.agencyMemberInvite.findFirst({
      where: { agencyId: membership.agencyId, userId: targetUser.id, status: 'pending' },
    })
    if (existingInvite) {
      return NextResponse.json({ error: 'Bu kullanıcıya zaten bekleyen bir davet var' }, { status: 409 })
    }

    // Davet oluştur (DOĞRUDAN EKLEME YOK — kullanıcı onayı gerekir)
    const invite = await prisma.agencyMemberInvite.create({
      data: {
        agencyId: membership.agencyId,
        userId: targetUser.id,
        invitedById: authUser.id,
        status: 'pending',
      },
    })

    // Kullanıcıya bildirim + push gönder
    await createNotificationWithPush({
      userId: targetUser.id,
      type: 'agency_invite',
      title: 'Ajans Daveti',
      message: `${agency.name} ajansı sizi üye olmaya davet etti. Kabul etmek için dokunun.`,
      fromUserId: authUser.id,
      targetPath: '/ajans',
      targetId: invite.id,
      data: JSON.stringify({ inviteId: invite.id, agencyId: agency.id, agencyName: agency.name }),
    })

    return NextResponse.json({
      success: true,
      invited: true,
      inviteId: invite.id,
      message: `${targetUser.name || targetUser.username} kullanıcısına davet gönderildi. Kabul edince ajansa katılacak.`,
    })
  } catch (error: any) {
    console.error('[Agency Members POST] Error:', error)
    return NextResponse.json({ error: 'Davet gönderilirken hata oluştu' }, { status: 500 })
  }
}

// DELETE: Remove member (owner/manager only)
export async function DELETE(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const myMembership = await prisma.agencyUser.findUnique({
      where: { userId: authUser.id },
      include: { agency: { select: { ownerId: true } } }
    })
    if (!myMembership || !['owner', 'manager'].includes(myMembership.role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json({ error: 'Üye ID gerekli' }, { status: 400 })
    }

    const targetMember = await prisma.agencyUser.findUnique({
      where: { id: memberId },
    })

    if (!targetMember || targetMember.agencyId !== myMembership.agencyId) {
      return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
    }

    // Cannot remove the owner
    if (targetMember.userId === myMembership.agency.ownerId) {
      return NextResponse.json({ error: 'Ajans sahibi çıkarılamaz' }, { status: 400 })
    }

    // Managers cannot remove other managers (only owner can)
    if (targetMember.role === 'manager' && myMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Sadece ajans sahibi yöneticileri çıkarabilir' }, { status: 403 })
    }

    await prisma.agencyUser.delete({ where: { id: memberId } })

    await prisma.agency.update({
      where: { id: myMembership.agencyId },
      data: {
        totalMembers: { decrement: 1 },
        activeMembers: targetMember.isActive ? { decrement: 1 } : undefined,
      }
    })

    return NextResponse.json({ success: true, message: 'Üye ajansdan çıkarıldı' })
  } catch (error: any) {
    console.error('[Agency Members DELETE] Error:', error)
    return NextResponse.json({ error: 'Üye çıkarılırken hata oluştu' }, { status: 500 })
  }
}
