import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

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

    const members = await prisma.agencyUser.findMany({
      where: { agencyId: membership.agencyId },
      include: {
        user: {
          select: { id: true, name: true, username: true, image: true, createdAt: true, lastActiveAt: true }
        }
      },
      orderBy: { joinedAt: 'desc' },
    })

    // Also get pending leave requests
    const leaveRequests = await prisma.agencyLeaveRequest.findMany({
      where: { agencyId: membership.agencyId, status: 'pending' },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } }
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ members, leaveRequests })
  } catch (error: any) {
    console.error('[Agency Members] Error:', error)
    return NextResponse.json({ error: 'Üyeler alınamadı' }, { status: 500 })
  }
}

// POST: Add member by username (owner/manager only)
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

    // Check if already in an agency
    const existingMembership = await prisma.agencyUser.findUnique({
      where: { userId: targetUser.id },
    })
    if (existingMembership) {
      return NextResponse.json({ error: 'Bu kullanıcı zaten bir ajansa üye' }, { status: 409 })
    }

    // Add to agency
    await prisma.agencyUser.create({
      data: {
        agencyId: membership.agencyId,
        userId: targetUser.id,
        role: 'member',
        joinedVia: 'direct',
        isActive: true,
      }
    })

    // Update agency counts
    await prisma.agency.update({
      where: { id: membership.agencyId },
      data: {
        totalMembers: { increment: 1 },
        activeMembers: { increment: 1 },
      }
    })

    return NextResponse.json({ success: true, message: `${targetUser.name || targetUser.username} ajansa eklendi` })
  } catch (error: any) {
    console.error('[Agency Members POST] Error:', error)
    return NextResponse.json({ error: 'Üye eklenirken hata oluştu' }, { status: 500 })
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
