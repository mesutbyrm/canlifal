import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [totalUsers, totalFortunes, fortunesByType] = await Promise.all([
      prisma.user.count(),
      prisma.fortune.count(),
      prisma.fortune.groupBy({
        by: ['fortuneType'],
        _count: true,
      }),
    ])

    const stats = {
      totalUsers,
      totalFortunes,
      fortunesByType: fortunesByType?.reduce((acc: Record<string, number>, item: any) => {
        acc[item?.fortuneType] = item?._count
        return acc
      }, {} as Record<string, number>),
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Fetch statistics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
