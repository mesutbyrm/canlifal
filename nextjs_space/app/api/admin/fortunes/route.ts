import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
      { error: 'Failed to fetch fortunes' },
      { status: 500 }
    )
  }
}
