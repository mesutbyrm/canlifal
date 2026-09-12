import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// Update teller permissions (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { tellerId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Check if admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!(await staffCan(user?.role, (session?.user as any)?.id, 'content.teller.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const body = await request.json()
    const {
      canGoOnline,
      canChat,
      canStartSession,
      canSetPrice,
      canEditProfile,
      canViewEarnings,
      canWithdraw,
      maxSessionsPerDay,
      commissionRate,
      adminNotes
    } = body

    const teller = await prisma.liveFortuneTeller.update({
      where: { id: params.tellerId },
      data: {
        canGoOnline: canGoOnline ?? true,
        canChat: canChat ?? true,
        canStartSession: canStartSession ?? true,
        canSetPrice: canSetPrice ?? false,
        canEditProfile: canEditProfile ?? true,
        canViewEarnings: canViewEarnings ?? true,
        canWithdraw: canWithdraw ?? false,
        maxSessionsPerDay: maxSessionsPerDay ?? 10,
        commissionRate: commissionRate ?? 20,
        adminNotes: adminNotes || null
      }
    })

    recordAudit({ actorId: session.user.id, action: 'teller_permissions_update', targetType: 'live_fortune_teller', targetId: params.tellerId, ip: getAuditIp(request), metadata: { canGoOnline, canChat, canStartSession, commissionRate } }).catch(() => {})

    return NextResponse.json({ success: true, teller })
  } catch (error) {
    console.error('Update permissions error:', error)
    return NextResponse.json({ error: 'İzinler güncellenemedi' }, { status: 500 })
  }
}
