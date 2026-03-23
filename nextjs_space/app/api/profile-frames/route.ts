import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: List available frames for the current user based on membership
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { membership: true, profileFrameId: true, adminAssignedFrameId: true }
    })

    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

    // Determine which tiers user can access
    const accessibleTiers = ['free']
    if (user.membership === 'gold' || user.membership === 'premium') {
      accessibleTiers.push('gold')
    }

    const frames = await prisma.profileFrame.findMany({
      where: {
        isActive: true,
        tier: { in: accessibleTiers }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({
      frames,
      currentFrameId: user.profileFrameId,
      adminAssignedFrameId: user.adminAssignedFrameId,
      membership: user.membership
    })
  } catch (error) {
    console.error('Fetch frames error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// POST: User selects a frame
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { frameId } = await request.json()

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { membership: true }
    })

    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

    // If removing frame
    if (!frameId) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { profileFrameId: null }
      })
      return NextResponse.json({ success: true })
    }

    // Verify frame exists and user has access
    const frame = await prisma.profileFrame.findUnique({ where: { id: frameId } })
    if (!frame || !frame.isActive) {
      return NextResponse.json({ error: 'Frame not found' }, { status: 404 })
    }

    if (frame.tier === 'admin_only') {
      return NextResponse.json({ error: 'Bu çerçeve sadece admin tarafından atanabilir' }, { status: 403 })
    }

    if (frame.tier === 'gold' && user.membership !== 'gold' && user.membership !== 'premium') {
      return NextResponse.json({ error: 'Bu çerçeve Gold üyelik gerektirir' }, { status: 403 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { profileFrameId: frameId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Select frame error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
