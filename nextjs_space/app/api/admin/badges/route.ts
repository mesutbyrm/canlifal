import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const badges = await prisma.customBadge.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    })

    return NextResponse.json({ badges })
  } catch (error) {
    console.error('Admin badges GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { name, icon, color, bgColor, description, tier, userId } = body

    if (!name || !icon) {
      return NextResponse.json({ error: 'Name and icon are required' }, { status: 400 })
    }

    const badge = await prisma.customBadge.create({
      data: {
        name,
        icon,
        color: color || '#fbbf24',
        bgColor: bgColor || '#78350f',
        description: description || null,
        tier: tier || null,
        userId: userId || null,
      }
    })

    return NextResponse.json({ badge })
  } catch (error) {
    console.error('Admin badges POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { id, name, icon, color, bgColor, description, tier, userId, isActive, sortOrder } = body

    if (!id) {
      return NextResponse.json({ error: 'Badge ID required' }, { status: 400 })
    }

    const badge = await prisma.customBadge.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(bgColor !== undefined && { bgColor }),
        ...(description !== undefined && { description }),
        ...(tier !== undefined && { tier: tier || null }),
        ...(userId !== undefined && { userId: userId || null }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      }
    })

    return NextResponse.json({ badge })
  } catch (error) {
    console.error('Admin badges PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Badge ID required' }, { status: 400 })
    }

    await prisma.customBadge.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin badges DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
