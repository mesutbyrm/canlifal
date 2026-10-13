import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getCachedGiftTypes } from '@/lib/cache'
import { serializeGiftMedia } from '@/lib/media-url'

// Get available gift types (cached - 10min TTL)
export async function GET() {
  try {
    const giftTypes = await getCachedGiftTypes()
    return NextResponse.json((giftTypes || []).map(serializeGiftMedia))
  } catch (error) {
    console.error('Error fetching gift types:', error)
    return NextResponse.json([], { status: 500 })
  }
}
