import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all rooms with commission settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true } })
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const rooms = await prisma.chatRoom.findMany({
      select: {
        id: true, slug: true, nameTr: true, nameEn: true, icon: true, isActive: true,
        giftCommissionPercent: true, giftBeneficiaryId: true,
        ownerId: true,
        owner: { select: { id: true, name: true, username: true } },
        giftBeneficiary: { select: { id: true, name: true, username: true } },
        _count: { select: { chatGifts: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error('Admin rooms error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update room commission settings
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true } })
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { roomId, giftCommissionPercent, giftBeneficiaryId } = await req.json()
    if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 })

    const updateData: any = {}
    if (typeof giftCommissionPercent === 'number') {
      updateData.giftCommissionPercent = Math.max(0, Math.min(100, giftCommissionPercent))
    }
    if (giftBeneficiaryId !== undefined) {
      updateData.giftBeneficiaryId = giftBeneficiaryId || null
    }

    const room = await prisma.chatRoom.update({
      where: { id: roomId },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, username: true } },
        giftBeneficiary: { select: { id: true, name: true, username: true } }
      }
    })

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Admin room update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
