import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// Admin: Bekleyen doğrulamaları listele
export async function GET(request: NextRequest) {
  try {
    const session = await getStaffSession()
    if (!session?.user?.id || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.teller.manage', ['admin', 'yonetici', 'moderator']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'pending'

    const tellers = await prisma.liveFortuneTeller.findMany({
      where: { verificationStatus: statusFilter },
      include: { user: { select: { id: true, name: true, username: true, email: true, image: true } } },
      orderBy: { updatedAt: 'desc' },
    })

    // İstatistikler
    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.liveFortuneTeller.count({ where: { verificationStatus: 'pending' } }),
      prisma.liveFortuneTeller.count({ where: { verificationStatus: 'approved' } }),
      prisma.liveFortuneTeller.count({ where: { verificationStatus: 'rejected' } }),
    ])

    return NextResponse.json({
      tellers: tellers.map(t => ({
        id: t.id, userId: t.userId, displayName: t.displayName,
        avatar: t.avatar || t.user?.image,
        username: t.user?.username, email: t.user?.email,
        verificationDocUrl: t.verificationDocUrl,
        verificationStatus: t.verificationStatus,
        verificationNote: t.verificationNote,
        isVerified: t.isVerified,
      })),
      stats: { pending: pendingCount, approved: approvedCount, rejected: rejectedCount },
    })
  } catch (error) {
    console.error('Admin verification GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// Admin: Onayla/Reddet
export async function POST(request: NextRequest) {
  try {
    const session = await getStaffSession()
    if (!session?.user?.id || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.teller.manage', ['admin', 'yonetici', 'moderator']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    const { tellerId, action, note } = await request.json()
    if (!tellerId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
    }

    await prisma.liveFortuneTeller.update({
      where: { id: tellerId },
      data: {
        verificationStatus: action === 'approve' ? 'approved' : 'rejected',
        isVerified: action === 'approve',
        verificationNote: note || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin verification POST error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
