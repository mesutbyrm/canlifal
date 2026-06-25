import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// Toggle join/leave fan club
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const celebrity = await prisma.celebrity.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    })
    if (!celebrity) {
      return NextResponse.json({ error: 'Ünlü bulunamadı' }, { status: 404 })
    }

    let fanClub = await prisma.fanClub.findUnique({
      where: { celebrityId: celebrity.id },
    })
    if (!fanClub) {
      fanClub = await prisma.fanClub.create({
        data: { celebrityId: celebrity.id },
      })
    }

    const existing = await prisma.fanClubMember.findUnique({
      where: { fanClubId_userId: { fanClubId: fanClub.id, userId: authUser.id } },
    })

    if (existing) {
      // Leave
      await prisma.$transaction([
        prisma.fanClubMember.delete({ where: { id: existing.id } }),
        prisma.fanClub.update({ where: { id: fanClub.id }, data: { memberCount: { decrement: 1 } } }),
      ])
      return NextResponse.json({ joined: false, memberCount: Math.max(0, fanClub.memberCount - 1) })
    } else {
      // Join
      await prisma.$transaction([
        prisma.fanClubMember.create({ data: { fanClubId: fanClub.id, userId: authUser.id } }),
        prisma.fanClub.update({ where: { id: fanClub.id }, data: { memberCount: { increment: 1 } } }),
      ])
      return NextResponse.json({ joined: true, memberCount: fanClub.memberCount + 1 })
    }
  } catch (error) {
    console.error('Fan club join error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
