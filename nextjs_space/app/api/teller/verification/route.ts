import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Falcının kendi doğrulama durumunu görmesi ve belge yüklemesi
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })

    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { userId: session.user.id },
      select: { verificationStatus: true, verificationDocUrl: true, verificationNote: true, isVerified: true }
    })
    if (!teller) return NextResponse.json({ error: 'Falcı profili bulunamadı' }, { status: 404 })

    return NextResponse.json(teller)
  } catch (error) {
    console.error('Verification GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// Falcı belge URL'si gönderir
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })

    const { docUrl } = await request.json()
    if (!docUrl) return NextResponse.json({ error: 'Belge URL\'si gerekli' }, { status: 400 })

    const teller = await prisma.liveFortuneTeller.findUnique({ where: { userId: session.user.id } })
    if (!teller) return NextResponse.json({ error: 'Falcı profili bulunamadı' }, { status: 404 })

    await prisma.liveFortuneTeller.update({
      where: { userId: session.user.id },
      data: { verificationDocUrl: docUrl, verificationStatus: 'pending', verificationNote: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Verification POST error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
