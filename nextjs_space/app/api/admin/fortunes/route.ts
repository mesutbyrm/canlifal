import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getHybridSession(request)
    
    if (!session?.user?.id || !(await staffCan(session?.user?.role, (session?.user as any)?.id, 'content.teller.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const fortuneType = searchParams.get('type')
    const userId = searchParams.get('userId')

    const where: any = {}
    if (fortuneType) where.fortuneType = fortuneType
    if (userId) where.userId = userId

    const fortunes = await prisma.fortune.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ fortunes })
  } catch (error) {
    console.error('Fetch fortunes error:', error)
    return NextResponse.json(
      { error: 'Fallar alınamadı' },
      { status: 500 }
    )
  }
}
