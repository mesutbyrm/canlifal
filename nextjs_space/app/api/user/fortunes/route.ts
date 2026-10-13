import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const savedOnly = searchParams.get('saved') === 'true'
    const pinnedOnly = searchParams.get('pinned') === 'true'

    const where: { userId: string; isSaved?: boolean; isPinned?: boolean } = { userId: auth.id }
    if (savedOnly) where.isSaved = true
    if (pinnedOnly) where.isPinned = true

    const fortunes = await prisma.fortune.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { pinnedAt: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        fortuneType: true,
        inputData: true,
        aiResponse: true,
        language: true,
        viewCount: true,
        isSaved: true,
        isPinned: true,
        pinnedAt: true,
        createdAt: true
      }
    })

    return NextResponse.json({ fortunes })
  } catch (error) {
    console.error('Fortunes fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
