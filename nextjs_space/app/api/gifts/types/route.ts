import { NextResponse } from 'next/server'
import { getCachedGiftTypes } from '@/lib/cache'

export async function GET() {
  try {
    const giftTypes = await getCachedGiftTypes()
    return NextResponse.json(giftTypes, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    console.error('Error fetching gift types:', error)
    return NextResponse.json([], { status: 500 })
  }
}
