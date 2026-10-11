import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getStaffSession()
    if (!session?.user?.id || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const messages = await prisma.tickerMessage.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Fetch ticker messages error:', error)
    return NextResponse.json({ error: 'Veriler alınamadı' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getStaffSession()
    if (!session?.user?.id || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
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
    return NextResponse.json({ error: 'Oluşturma başarısız' }, { status: 500 })
  }
}
