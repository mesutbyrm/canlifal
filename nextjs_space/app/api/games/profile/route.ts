import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: Fetch user game profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    let profile = await prisma.userGameProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile) {
      profile = await prisma.userGameProfile.create({
        data: { userId: session.user.id },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, name: true, username: true, image: true, referralCode: true },
    })

    return NextResponse.json({
      ...profile,
      cfcBalance: user?.credits || 0,
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
