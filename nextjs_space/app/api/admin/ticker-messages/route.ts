import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const messages = await prisma.tickerMessage.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Fetch ticker messages error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text, icon } = await req.json()
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const maxOrder = await prisma.tickerMessage.aggregate({ _max: { sortOrder: true } })
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1

    const message = await prisma.tickerMessage.create({
      data: {
        text: text.trim(),
        icon: icon || '✨',
        sortOrder: nextOrder,
      },
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('Create ticker message error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
