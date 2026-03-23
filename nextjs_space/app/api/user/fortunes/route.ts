import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const savedOnly = searchParams.get('saved') === 'true'
    const pinnedOnly = searchParams.get('pinned') === 'true'

    const where: { userId: string; isSaved?: boolean; isPinned?: boolean } = { userId: session.user.id }
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
