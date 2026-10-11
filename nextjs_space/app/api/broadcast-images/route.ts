import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getCached, CACHE_TTL } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// GET - Fetch active broadcast/background images (authenticated users)
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    const images = await getCached('broadcast:images', CACHE_TTL.HOMEPAGE_CARDS, async () => {
      return prisma.broadcastImage.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          imageUrl: true,
          sortOrder: true
        }
      })
    })
    
    return NextResponse.json(images)
  } catch (error) {
    console.error('Error fetching broadcast images:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
