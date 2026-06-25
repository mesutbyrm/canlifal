import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// GET: Fetch user game profile
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    let profile = await prisma.userGameProfile.findUnique({ where: { userId: authUser.id } })
    if (!profile) {
      profile = await prisma.userGameProfile.create({
        data: { userId: authUser.id },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { credits: true, jetonBalance: true, name: true, username: true, image: true, referralCode: true },
    })

    return NextResponse.json({
      ...profile,
      cfcBalance: user?.credits || 0,
      jetonBalance: user?.jetonBalance || 0,
      name: user?.name || '',
      username: user?.username || null,
      image: user?.image || null,
      userReferralCode: user?.referralCode || null,
    })
  } catch (error: any) {
    console.error('Game profile error:', error)
    return NextResponse.json({ error: 'Profil yüklenemedi' }, { status: 500 })
  }
}
