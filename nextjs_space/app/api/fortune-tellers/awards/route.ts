import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get active awards for a teller
export async function GET(request: NextRequest) {
  try {
    const tellerId = request.nextUrl.searchParams.get('tellerId')
    if (!tellerId) {
      return NextResponse.json({ error: 'tellerId required' }, { status: 400 })
    }

    const now = new Date()
    const awards = await prisma.tellerAward.findMany({
      where: {
        tellerId,
        endDate: { gte: now }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(awards)
  } catch (error) {
    console.error('Fetch awards error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
