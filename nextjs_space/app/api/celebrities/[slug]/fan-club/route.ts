import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// Get fan club for a celebrity
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const celebrity = await prisma.celebrity.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true, slug: true, profileImage: true },
    })
    if (!celebrity) {
      return NextResponse.json({ error: 'Ünlü bulunamadı' }, { status: 404 })
    }

    let fanClub = await prisma.fanClub.findUnique({
      where: { celebrityId: celebrity.id },
    })

    // Auto-create fan club if doesn't exist
    if (!fanClub) {
      fanClub = await prisma.fanClub.create({
        data: {
          celebrityId: celebrity.id,
          description: `${celebrity.name} resmi fan kulübüne hoş geldiniz!`,
          rules: JSON.stringify(['Saygılı olun', 'Spam yapmayın', 'Konu dışı paylaşımlardan kaçının']),
        },
      })
    }

    const authUser = await authenticateRequest(req)
    let isMember = false
    let memberRole = null
    if (authUser?.id) {
      const membership = await prisma.fanClubMember.findUnique({
        where: { fanClubId_userId: { fanClubId: fanClub.id, userId: authUser.id } },
      })
      if (membership) {
        isMember = true
        memberRole = membership.role
      }
    }

    return NextResponse.json({
      fanClub: {
        ...fanClub,
        rules: fanClub.rules ? JSON.parse(fanClub.rules) : [],
        isMember,
        memberRole,
        celebrity,
      },
    })
  } catch (error) {
    console.error('Fan club GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
