import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Public API to get ad settings (for displaying ads)
export async function GET() {
  try {
    const adSettings = await prisma.siteSetting.findMany({
      where: {
        key: {
          startsWith: 'ads_'
        }
      }
    })
    
    const settingsMap: Record<string, string> = {}
    adSettings.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value
    })

    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('Get ad settings error:', error)
    return NextResponse.json({})
  }
}
