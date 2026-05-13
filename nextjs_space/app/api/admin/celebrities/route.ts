import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator']

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (category && category !== 'all') where.category = category
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [celebrities, total] = await Promise.all([
      prisma.celebrity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { followers: true } } },
      }),
      prisma.celebrity.count({ where }),
    ])

    return NextResponse.json({ celebrities, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Admin celebrities GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const { name, category, bio, profileImage, coverImage, birthDate, birthPlace, zodiacSign, socialLinks, achievements } = body

    if (!name || !category) {
      return NextResponse.json({ error: 'İsim ve kategori gerekli' }, { status: 400 })
    }

    let slug = slugify(name)
    // Check slug uniqueness
    const existing = await prisma.celebrity.findUnique({ where: { slug } })
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const celebrity = await prisma.celebrity.create({
      data: {
        name,
        slug,
        category,
        bio: bio || null,
        profileImage: profileImage || null,
        coverImage: coverImage || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        birthPlace: birthPlace || null,
        zodiacSign: zodiacSign || null,
        socialLinks: socialLinks ? JSON.stringify(socialLinks) : null,
        achievements: achievements ? JSON.stringify(achievements) : null,
      },
    })

    return NextResponse.json({ celebrity }, { status: 201 })
  } catch (error) {
    console.error('Admin celebrities POST error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const { id, name, category, bio, profileImage, coverImage, birthDate, birthPlace, zodiacSign, socialLinks, achievements, isActive, isVerified } = body

    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }

    const data: any = {}
    if (name !== undefined) data.name = name
    if (category !== undefined) data.category = category
    if (bio !== undefined) data.bio = bio || null
    if (profileImage !== undefined) data.profileImage = profileImage || null
    if (coverImage !== undefined) data.coverImage = coverImage || null
    if (birthDate !== undefined) data.birthDate = birthDate ? new Date(birthDate) : null
    if (birthPlace !== undefined) data.birthPlace = birthPlace || null
    if (zodiacSign !== undefined) data.zodiacSign = zodiacSign || null
    if (socialLinks !== undefined) data.socialLinks = socialLinks ? JSON.stringify(socialLinks) : null
    if (achievements !== undefined) data.achievements = achievements ? JSON.stringify(achievements) : null
    if (isActive !== undefined) data.isActive = isActive
    if (isVerified !== undefined) data.isVerified = isVerified

    const celebrity = await prisma.celebrity.update({
      where: { id },
      data,
    })

    return NextResponse.json({ celebrity })
  } catch (error) {
    console.error('Admin celebrities PUT error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }

    await prisma.celebrity.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin celebrities DELETE error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
