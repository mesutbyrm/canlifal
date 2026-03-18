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
    if (!session?.user) return NextResponse.json({ error: 'Giriş yapın' }, { status: 401 })
    const userId = (session.user as any).id

    const reports = await prisma.weeklyDreamReport.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
      take: 4,
    })

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Weekly report GET error:', error)
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Giriş yapın' }, { status: 401 })
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
      return NextResponse.json({ error: 'Geçen hafta rüya kaydı bulunamadı' }, { status: 400 })
    }

    const allSymbols = entries.flatMap((e: any) => e.symbols || [])
    const symbolCounts: Record<string, number> = {}
    allSymbols.forEach((s: string) => { symbolCounts[s] = (symbolCounts[s] || 0) + 1 })
    const topSymbols = Object.entries(symbolCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s)

    const dreamsText = entries.map((e: any) => `${e.dreamDate.toISOString().split('T')[0]}: ${e.title} - ${e.content}`).join('\n')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Sen bir rüya analisti ve psikologsun. Kullanıcının haftalık rüya günlüğünü analiz et. Tekrarlayan temalar, duygusal durumlar ve semboller hakkında içgörüler sun. Türkçe yaz. HTML formatında yaz.' },
        { role: 'user', content: `Haftalık rüya günlüğü:\n${dreamsText}\n\nÖne çıkan semboller: ${topSymbols.join(', ')}` },
      ],
      max_tokens: 1000,
    })

    const reportContent = completion.choices[0]?.message?.content || 'Rapor oluşturulamadı'

    const report = await prisma.weeklyDreamReport.create({
      data: { userId, weekStart, weekEnd, reportContent, dreamCount: entries.length, topSymbols },
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Weekly report POST error:', error)
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 })
  }
}
