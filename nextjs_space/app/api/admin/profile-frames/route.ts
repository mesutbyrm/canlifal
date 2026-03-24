import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: List all profile frames (admin)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const frames = await prisma.profileFrame.findMany({
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(frames)
  } catch (error) {
    console.error('Fetch frames error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// POST: Create or update a profile frame
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, imageUrl, tier, isActive, sortOrder } = body

    if (!name || !imageUrl) {
      return NextResponse.json({ error: 'Name and imageUrl are required' }, { status: 400 })
    }

    let frame
    if (id) {
      frame = await prisma.profileFrame.update({
        where: { id },
        data: { name, imageUrl, tier: tier || 'gold', isActive: isActive ?? true, sortOrder: sortOrder ?? 0 }
      })
    } else {
      frame = await prisma.profileFrame.create({
        data: { name, imageUrl, tier: tier || 'gold', isActive: isActive ?? true, sortOrder: sortOrder ?? 0 }
      })
    }

    return NextResponse.json(frame)
  } catch (error) {
    console.error('Save frame error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// DELETE: Remove a profile frame
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    // Remove frame references from users
    await prisma.user.updateMany({ where: { profileFrameId: id }, data: { profileFrameId: null } })
    await prisma.user.updateMany({ where: { adminAssignedFrameId: id }, data: { adminAssignedFrameId: null } })

    await prisma.profileFrame.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete frame error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
