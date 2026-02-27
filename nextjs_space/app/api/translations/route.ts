import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const translations = await prisma.translation.findMany()
    
    // Group by language
    const grouped: Record<string, Record<string, string>> = {}
    
    translations?.forEach((t: any) => {
      if (!grouped[t?.languageCode]) {
        grouped[t?.languageCode] = {}
      }
      grouped[t?.languageCode][t?.translationKey] = t?.translationValue
    })
    
    return NextResponse.json(grouped)
  } catch (error) {
    console.error('Translation fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch translations' },
      { status: 500 }
    )
  }
}
