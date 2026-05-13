import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator']

async function isAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return false
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  return user && ADMIN_ROLES.includes(user.role || '')
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const celebrityId = searchParams.get('celebrityId')
    const platform = searchParams.get('platform')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (celebrityId) where.celebrityId = celebrityId
    if (platform) where.platform = platform

    const [posts, total] = await Promise.all([
      prisma.celebrityPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          celebrity: { select: { name: true, slug: true, profileImage: true } },
        },
      }),
      prisma.celebrityPost.count({ where }),
    ])

    return NextResponse.json({ posts, total, page, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('Admin celebrity posts GET error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  try {
    const body = await req.json()
    const { celebrityId, platform, postType, content, mediaUrl, externalUrl, isPinned } = body

    if (!celebrityId || !platform) {
      return NextResponse.json({ error: 'celebrityId ve platform gerekli' }, { status: 400 })
    }

    const post = await prisma.celebrityPost.create({
      data: {
        celebrityId,
        platform,
        postType: postType || 'photo',
        content: content || null,
        mediaUrl: mediaUrl || null,
        externalUrl: externalUrl || null,
        isPinned: isPinned || false,
      },
      include: {
        celebrity: { select: { name: true, slug: true, profileImage: true } },
      },
    })

    return NextResponse.json({ post })
  } catch (err) {
    console.error('Admin celebrity post CREATE error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  try {
    const body = await req.json()
    const { id, ...updateData } = body
    if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

    const post = await prisma.celebrityPost.update({
      where: { id },
      data: updateData,
      include: {
        celebrity: { select: { name: true, slug: true, profileImage: true } },
      },
    })

    return NextResponse.json({ post })
  } catch (err) {
    console.error('Admin celebrity post UPDATE error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

    await prisma.celebrityPost.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin celebrity post DELETE error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
