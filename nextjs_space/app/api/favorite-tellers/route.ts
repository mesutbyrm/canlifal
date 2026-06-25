import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// GET: Kullanıcının favori falcılarını listele
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })

    const favorites = await prisma.favoriteTeller.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
    })

    // Falcı bilgilerini getir
    const tellerIds = favorites.map(f => f.tellerId)
    const tellers = await prisma.liveFortuneTeller.findMany({
      where: { userId: { in: tellerIds } },
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
    })

    const result = favorites.map(f => {
      const teller = tellers.find(t => t.userId === f.tellerId)
      return {
        id: f.id,
        tellerId: f.tellerId,
        createdAt: f.createdAt.toISOString(),
        teller: teller ? {
          id: teller.id,
          userId: teller.userId,
          displayName: teller.displayName,
          avatar: teller.avatar || teller.user?.image,
          specialties: teller.specialties,
          rating: teller.rating,
          isOnline: teller.isOnline,
          pricePerSession: teller.pricePerSession,
          tellerLevel: teller.tellerLevel,
        } : null,
      }
    }).filter(f => f.teller !== null)

    return NextResponse.json({ favorites: result })
  } catch (error) {
    console.error('Favorite tellers GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// POST: Favori ekle/çıkar (toggle)
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })

    const { tellerId } = await request.json()
    if (!tellerId) return NextResponse.json({ error: 'tellerId gerekli' }, { status: 400 })

    const existing = await prisma.favoriteTeller.findUnique({
      where: { userId_tellerId: { userId: authUser.id, tellerId } },
    })

    if (existing) {
      await prisma.favoriteTeller.delete({ where: { id: existing.id } })
      return NextResponse.json({ action: 'removed', isFavorite: false })
    } else {
      await prisma.favoriteTeller.create({ data: { userId: authUser.id, tellerId } })
      return NextResponse.json({ action: 'added', isFavorite: true })
    }
  } catch (error) {
    console.error('Favorite tellers POST error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
