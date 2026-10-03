import { NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getStaffSession()
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const badges = await prisma.membershipBadge.findMany({
      orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }],
    })

    return NextResponse.json(badges)
  } catch (error) {
    console.error('Membership badges fetch error:', error)
    return NextResponse.json({ error: 'Rozetler yüklenemedi' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getStaffSession()
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await request.json()
    const { name, tier, imageUrl, isActive, sortOrder } = body

    if (!name || !tier || !imageUrl) {
      return NextResponse.json({ error: 'Ad, üyelik türü ve görsel URL gereklidir' }, { status: 400 })
    }

    const badge = await prisma.membershipBadge.create({
      data: {
        name,
        tier,
        imageUrl,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
      },
    })

    return NextResponse.json(badge)
  } catch (error) {
    console.error('Membership badge create error:', error)
    return NextResponse.json({ error: 'Rozet oluşturulamadı' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getStaffSession()
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, tier, imageUrl, isActive, sortOrder } = body

    if (!id) {
      return NextResponse.json({ error: 'ID gereklidir' }, { status: 400 })
    }

    const badge = await prisma.membershipBadge.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(tier !== undefined && { tier }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json(badge)
  } catch (error) {
    console.error('Membership badge update error:', error)
    return NextResponse.json({ error: 'Rozet güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getStaffSession()
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID gereklidir' }, { status: 400 })
    }

    await prisma.membershipBadge.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Membership badge delete error:', error)
    return NextResponse.json({ error: 'Rozet silinemedi' }, { status: 500 })
  }
}
