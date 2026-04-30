import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const membership = await prisma.agencyUser.findUnique({
      where: { userId: session.user.id },
      include: { agency: { select: { id: true, ownerId: true } } }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Herhangi bir ajansa üye değilsiniz' }, { status: 400 })
    }

    // Agency owners cannot leave (they must transfer or close)
    if (membership.agency.ownerId === session.user.id) {
      return NextResponse.json({ error: 'Ajans sahibi olarak ayrılamazsınız. Ajansı kapatmanız gerekiyor.' }, { status: 400 })
    }

    // Delete membership
    await prisma.agencyUser.delete({ where: { id: membership.id } })

    // Update agency counts
    await prisma.agency.update({
      where: { id: membership.agencyId },
      data: {
        totalMembers: { decrement: 1 },
        activeMembers: membership.isActive ? { decrement: 1 } : undefined,
      }
    })

    return NextResponse.json({ success: true, message: 'Ajanstan başarıyla ayrıldınız' })
  } catch (error: any) {
    console.error('[Agency Leave] Error:', error)
    return NextResponse.json({ error: 'Ayrılma sırasında hata oluştu' }, { status: 500 })
  }
}
