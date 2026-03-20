import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    // Get all dream fortunes
    const dreamFortunes = await prisma.fortune.findMany({
      where: { userId, fortuneType: 'dream' },
      select: { id: true, inputData: true, aiResponse: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    })

    // Get dream diary entries
    const diaryEntries = await prisma.dreamDiaryEntry.findMany({
      where: { userId },
      select: { id: true, dreamDate: true, title: true, symbols: true, mood: true, lucidity: true, createdAt: true },
      orderBy: { dreamDate: 'desc' }
    })

    // Calculate monthly distribution
    const monthlyMap: Record<string, number> = {}
    const moodMap: Record<string, number> = {}
    const symbolMap: Record<string, number> = {}
    const dayOfWeekMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

    // Process dream fortunes for symbols and monthly data
    for (const fortune of dreamFortunes) {
      const date = new Date(fortune.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + 1
      dayOfWeekMap[date.getDay()] = (dayOfWeekMap[date.getDay()] || 0) + 1

      // Extract symbols from inputData
      try {
        const input = JSON.parse(fortune.inputData)
        const dreamText = (input.dream || input.content || '').toLowerCase()
        const commonSymbols = [
          'su', 'deniz', 'uçmak', 'uçak', 'yılan', 'kedi', 'köpek', 'ev', 'araba',
          'bebçek', 'anne', 'baba', 'para', 'altın', 'ölüm', 'düşmek',
          'koşmak', 'ağlamak', 'gülmek', 'ateş', 'dağ', 'orman',
          'çiçek', 'ay', 'güneş', 'yıldız', 'gece', 'rüzgar'
        ]
        for (const symbol of commonSymbols) {
          if (dreamText.includes(symbol)) {
            symbolMap[symbol] = (symbolMap[symbol] || 0) + 1
          }
        }
      } catch (e: any) { /* skip */ }
    }

    // Process diary entries for mood data
    for (const entry of diaryEntries) {
      if (entry.mood) {
        moodMap[entry.mood] = (moodMap[entry.mood] || 0) + 1
      }
      if (entry.symbols && Array.isArray(entry.symbols)) {
        for (const s of entry.symbols) {
          const sym = String(s).toLowerCase()
          symbolMap[sym] = (symbolMap[sym] || 0) + 1
        }
      }
    }

    // Sort symbols by frequency
    const topSymbols = Object.entries(symbolMap)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 15)
      .map(([symbol, count]) => ({ symbol, count }))

    // Monthly data sorted
    const monthlyData = Object.entries(monthlyMap)
      .sort((a: any, b: any) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, count]) => ({ month, count }))

    // Mood distribution
    const moodData = Object.entries(moodMap)
      .sort((a: any, b: any) => b[1] - a[1])
      .map(([mood, count]) => ({ mood, count }))

    // Day of week distribution
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
    const dayOfWeekData = Object.entries(dayOfWeekMap)
      .map(([day, count]) => ({ day: dayNames[parseInt(day)], count }))

    // Lucidity distribution
    const lucidityMap: Record<number, number> = {}
    for (const entry of diaryEntries) {
      if (entry.lucidity !== null && entry.lucidity !== undefined) {
        const level = entry.lucidity
        lucidityMap[level] = (lucidityMap[level] || 0) + 1
      }
    }
    const lucidityData = Object.entries(lucidityMap)
      .sort((a: any, b: any) => parseInt(a[0]) - parseInt(b[0]))
      .map(([level, count]) => ({ level: parseInt(level), count }))

    // Streak calculation
    let currentStreak = 0
    if (diaryEntries.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const sortedDates = diaryEntries
        .map((e: any) => {
          const d = new Date(e.dreamDate)
          d.setHours(0, 0, 0, 0)
          return d.getTime()
        })
        .filter((v: any, i: any, a: any) => a.indexOf(v) === i)
        .sort((a: any, b: any) => b - a)

      for (let i = 0; i < sortedDates.length; i++) {
        const expected = today.getTime() - i * 86400000
        if (sortedDates[i] === expected) {
          currentStreak++
        } else {
          break
        }
      }
    }

    return NextResponse.json({
      totalDreams: dreamFortunes.length,
      totalDiaryEntries: diaryEntries.length,
      currentStreak,
      topSymbols,
      monthlyData,
      moodData,
      dayOfWeekData,
      lucidityData,
      recentDreams: dreamFortunes.slice(0, 5).map((f: any) => ({
        id: f.id,
        date: f.createdAt,
        preview: (() => {
          try {
            const input = JSON.parse(f.inputData)
            return (input.dream || input.content || '').substring(0, 100)
          } catch { return '' }
        })()
      }))
    })
  } catch (error) {
    console.error('Dream stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}