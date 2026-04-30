import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const membership = await prisma.agencyUser.findUnique({
      where: { userId: session.user.id },
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

    return NextResponse.json({ members })
  } catch (error: any) {
    console.error('[Agency Members] Error:', error)
    return NextResponse.json({ error: 'Üyeler alınamadı' }, { status: 500 })
  }
}
