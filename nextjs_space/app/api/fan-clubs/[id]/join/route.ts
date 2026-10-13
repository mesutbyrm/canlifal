export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * POST /api/fan-clubs/:id/join — kulübe katıl / ayrıl (toggle)
 * Auth: ZORUNLU
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const club = await prisma.fanClub.findUnique({ where: { id }, select: { id: true, isActive: true } })
    if (!club || !club.isActive) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Fan kulübü bulunamadı' } },
        { status: 404 }
      )
    }

    const existing = await prisma.fanClubMember.findUnique({
      where: { fanClubId_userId: { fanClubId: id, userId: authUser.id } },
    })

    if (existing) {
      await prisma.$transaction([
        prisma.fanClubMember.delete({ where: { id: existing.id } }),
        prisma.fanClub.update({ where: { id }, data: { memberCount: { decrement: 1 } } }),
      ])
      return NextResponse.json({ success: true, data: { joined: false } })
    }

    await prisma.$transaction([
      prisma.fanClubMember.create({ data: { fanClubId: id, userId: authUser.id } }),
      prisma.fanClub.update({ where: { id }, data: { memberCount: { increment: 1 } } }),
    ])

    return NextResponse.json({ success: true, data: { joined: true } })
  } catch (error: any) {
    console.error('[fan-clubs] join error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Katılma işlemi başarısız' } },
      { status: 500 }
    )
  }
}
