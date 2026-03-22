import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { getClientIp } from '@/lib/fortune-access'

export const dynamic = 'force-dynamic'

/**
 * Record that a user watched a rewarded ad
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const ip = getClientIp(request)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (!session?.user?.id) {
      // Unregistered user - update IP usage
      const usage = await prisma.ipFortuneUsage.findUnique({
        where: { ipAddress_date: { ipAddress: ip, date: today } },
      })

      if (usage && usage.count === 1 && !usage.adWatched) {
        await prisma.ipFortuneUsage.update({
          where: { id: usage.id },
          data: { adWatched: true },
        })
        return NextResponse.json({ success: true, message: 'Reklam ödülü kaydedildi' })
      }

      return NextResponse.json({ success: false, message: 'Reklam izleme hakkı yok' }, { status: 400 })
    }

    // Registered user - just confirm ad watched (access control handles the rest)
    return NextResponse.json({ success: true, message: 'Reklam ödülü kaydedildi' })
  } catch (error) {
    console.error('Ad reward error:', error)
    return NextResponse.json({ success: false, message: 'Bir hata oluştu' }, { status: 500 })
  }
}
