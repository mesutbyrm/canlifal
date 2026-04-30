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
    })
  } catch (error: any) {
    console.error('[Agency My] Error:', error)
    return NextResponse.json({ error: 'Bilgi alınamadı' }, { status: 500 })
  }
}
