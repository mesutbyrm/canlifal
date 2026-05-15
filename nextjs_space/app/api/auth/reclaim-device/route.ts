import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// Reclaim the active session — kicks the other device and makes THIS device the active one
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Generate a new device token for the current session
    const newDeviceToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeDeviceToken: newDeviceToken }
    })

    return NextResponse.json({ 
      success: true, 
      deviceToken: newDeviceToken,
      message: 'Diğer cihaz çıkış yapıldı' 
    })
  } catch (error) {
    console.error('reclaim-device error:', error)
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 })
  }
}
