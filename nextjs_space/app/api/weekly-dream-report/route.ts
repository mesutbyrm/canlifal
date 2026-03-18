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

    const reports = await prisma.weeklyDreamReport.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
      take: 4,
    })

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Weekly report GET error:', error)
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Giri\u015f yap\u0131n' }, { status: 401 })
    const userId = (session.user as any).id

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() - 7) // last week monday
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const existing = await prisma.weeklyDreamReport.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    })
    if (existing) return NextResponse.json(existing)

    const entries = await prisma.dreamDiaryEntry.findMany({
      where: { userId, dreamDate: { gte: weekStart, lte: weekEnd } },
      orderBy: { dreamDate: 'asc' },
    })

    if (entries.length === 0) {
      return NextResponse.json({ error: 'Ge\u00e7en hafta r\u00fcya kayd\u0131 bulunamad\u0131' }, { status: 400 })
    }

    const allSymbols = entries.flatMap((e: any) => e.symbols || [])
    const symbolCounts: Record<string, number> = {}
    allSymbols.forEach((s: string) => { symbolCounts[s] = (symbolCounts[s] || 0) + 1 })
    const topSymbols = Object.entries(symbolCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s)

    const dreamsText = entries.map((e: any) => `${e.dreamDate.toISOString().split('T')[0]}: ${e.title} - ${e.content}`).join('\n')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Sen bir r\u00fcya analisti ve psikologsun. Kullan\u0131c\u0131n\u0131n haftal\u0131k r\u00fcya g\u00fcnl\u00fc\u011f\u00fcn\u00fc analiz et. Tekrarlayan temalar, duygusal durumlar ve semboller hakk\u0131nda i\u00e7g\u00f6r\u00fcler sun. T\u00fcrk\u00e7e yaz. HTML format\u0131nda yaz.' },
        { role: 'user', content: `Haftal\u0131k r\u00fcya g\u00fcnl\u00fc\u011f\u00fc:\n${dreamsText}\n\n\u00d6ne \u00e7\u0131kan semboller: ${topSymbols.join(', ')}` },
      ],
      max_tokens: 1000,
    })

    const reportContent = completion.choices[0]?.message?.content || 'Rapor olu\u015fturulamad\u0131'

    const report = await prisma.weeklyDreamReport.create({
      data: { userId, weekStart, weekEnd, reportContent, dreamCount: entries.length, topSymbols },
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Weekly report POST error:', error)
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}
