import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ valid: true }) // not logged in, skip check
    }

    const deviceToken = (session.user as any).deviceToken
    if (!deviceToken) {
      return NextResponse.json({ valid: true }) // old session without token
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeDeviceToken: true }
    })

    if (!user) {
      return NextResponse.json({ valid: false })
    }

    const valid = user.activeDeviceToken === deviceToken
    return NextResponse.json({ valid })
  } catch (error) {
    console.error('verify-device error:', error)
    return NextResponse.json({ valid: true }) // fail open
  }
}
