import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// GET /api/agency/invites — kullanıcıya gelen bekleyen ajans üyelik davetleri.
// Yanıt: { invites: [{ id, agency: { name, logoUrl }, invitedBy: { name, username }, createdAt }] }
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const invites = await prisma.agencyMemberInvite.findMany({
      where: {
        userId: authUser.id,
        status: 'pending',
        agency: { status: 'approved' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        agency: { select: { name: true, logoUrl: true } },
        invitedBy: { select: { name: true, username: true } },
      },
    })

    return NextResponse.json({ invites })
  } catch (error: any) {
    console.error('[Agency Invites GET] Error:', error)
    return NextResponse.json({ error: 'Davetler alınamadı' }, { status: 500 })
  }
}

// POST /api/agency/invites — { inviteId, action: 'accept' | 'reject' }
// Kabul, kullanıcıyı ajansa 'member' olarak ekler; kullanıcı zaten bir ajanstaysa reddedilir.
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const inviteId = typeof body?.inviteId === 'string' ? body.inviteId.trim() : ''
    const action = body?.action

    if (!inviteId) {
      return NextResponse.json({ error: 'Davet kimliği gerekli' }, { status: 400 })
    }
    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
    }

    const invite = await prisma.agencyMemberInvite.findFirst({
      where: { id: inviteId, userId: authUser.id, status: 'pending' },
      include: { agency: { select: { id: true, name: true, status: true } } },
    })
    if (!invite) {
      return NextResponse.json({ error: 'Davet bulunamadı veya artık geçerli değil' }, { status: 404 })
    }

    if (action === 'reject') {
      await prisma.agencyMemberInvite.update({
        where: { id: invite.id },
        data: { status: 'rejected', respondedAt: new Date() },
      })
      return NextResponse.json({ success: true, status: 'rejected' })
    }

    if (invite.agency.status !== 'approved') {
      return NextResponse.json({ error: 'Bu ajans aktif değil' }, { status: 400 })
    }

    const existingMember = await prisma.agencyUser.findUnique({ where: { userId: authUser.id } })
    if (existingMember) {
      return NextResponse.json(
        { error: 'Zaten bir ajansın üyesisiniz. Önce ayrılmanız gerekiyor.' },
        { status: 400 }
      )
    }

    await prisma.$transaction([
      prisma.agencyUser.create({
        data: {
          agencyId: invite.agencyId,
          userId: authUser.id,
          role: 'member',
          joinedVia: 'member_invite',
        },
      }),
      prisma.agencyMemberInvite.update({
        where: { id: invite.id },
        data: { status: 'accepted', respondedAt: new Date() },
      }),
      prisma.agency.update({
        where: { id: invite.agencyId },
        data: { totalMembers: { increment: 1 }, activeMembers: { increment: 1 } },
      }),
    ])

    return NextResponse.json({
      success: true,
      status: 'accepted',
      agencyName: invite.agency.name,
    })
  } catch (error: any) {
    console.error('[Agency Invites POST] Error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Zaten bir ajansın üyesisiniz' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Davet işlenirken hata oluştu' }, { status: 500 })
  }
}
