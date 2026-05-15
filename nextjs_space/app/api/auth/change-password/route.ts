import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Yeni şifre en az 6 karakter olmalıdır' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // If user has a password (credentials user), verify current password
    if (user.password) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Mevcut şifrenizi girin' }, { status: 400 })
      }
      const isValid = await bcrypt.compare(currentPassword, user.password)
      if (!isValid) {
        return NextResponse.json({ error: 'Mevcut şifre yanlış' }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password AND generate new device token to invalidate all other sessions
    const newDeviceToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        password: hashedPassword,
        activeDeviceToken: newDeviceToken
      }
    })

    return NextResponse.json({ 
      success: true, 
      deviceToken: newDeviceToken,
      message: 'Şifre başarıyla değiştirildi' 
    })
  } catch (error) {
    console.error('change-password error:', error)
    return NextResponse.json({ error: 'Şifre değiştirilemedi' }, { status: 500 })
  }
}
