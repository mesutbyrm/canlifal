import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get members of a fan club
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')

    const celebrity = await prisma.celebrity.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    })
    if (!celebrity) {
      return NextResponse.json({ error: 'Ünlü bulunamadı' }, { status: 404 })
    }

    const fanClub = await prisma.fanClub.findUnique({
      where: { celebrityId: celebrity.id },
    })
    if (!fanClub) {
      return NextResponse.json({ members: [], total: 0 })
    }

    const [members, total] = await Promise.all([
      prisma.fanClubMember.findMany({
        where: { fanClubId: fanClub.id },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, image: true, username: true, membership: true } },
        },
      }),
      prisma.fanClubMember.count({ where: { fanClubId: fanClub.id } }),
    ])

    return NextResponse.json({ members, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Fan club members GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
