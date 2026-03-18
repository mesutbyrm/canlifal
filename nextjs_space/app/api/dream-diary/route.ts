export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY || '',
  baseURL: 'https://routellm.abacus.ai/v1',
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Giri\u015f yap\u0131n' }, { status: 401 })
    const userId = (session.user as any).id

    const { searchParams } = new URL(req.url)
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const entries = await prisma.dreamDiaryEntry.findMany({
      where: {
        userId,
        dreamDate: { gte: startDate, lte: endDate },
      },
      orderBy: { dreamDate: 'asc' },
    })

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Dream diary GET error:', error)
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Giri\u015f yap\u0131n' }, { status: 401 })
    const userId = (session.user as any).id

    const { dreamDate, title, content, symbols, mood, lucidity, analyzeWithAI } = await req.json()
    if (!dreamDate || !title || !content) {
      return NextResponse.json({ error: 'Tarih, ba\u015fl\u0131k ve i\u00e7erik gerekli' }, { status: 400 })
    }

    let aiAnalysis: string | null = null
    if (analyzeWithAI) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Sen bir r\u00fcya tabircisisin. T\u00fcrk r\u00fcya tabiri gelene\u011fine g\u00f6re r\u00fcyalar\u0131 yorumla. K\u0131sa ve \u00f6z yorumla. T\u00fcrk\u00e7e yaz.' },
            { role: 'user', content: `R\u00fcyam: ${content}` },
          ],
          max_tokens: 500,
        })
        aiAnalysis = completion.choices[0]?.message?.content || null
      } catch (e) { console.error('AI analysis error:', e) }
    }

    const entry = await prisma.dreamDiaryEntry.upsert({
      where: { userId_dreamDate: { userId, dreamDate: new Date(dreamDate) } },
      update: { title, content, symbols: symbols || [], mood, lucidity, aiAnalysis },
      create: { userId, dreamDate: new Date(dreamDate), title, content, symbols: symbols || [], mood, lucidity, aiAnalysis },
    })

    // Award XP for diary entry
    await prisma.user.update({ where: { id: userId }, data: { xp: { increment: 5 } } })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Dream diary POST error:', error)
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Giri\u015f yap\u0131n' }, { status: 401 })
    const userId = (session.user as any).id
    const { id } = await req.json()

    await prisma.dreamDiaryEntry.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}
