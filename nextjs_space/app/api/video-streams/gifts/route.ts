import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getCachedGiftTypes } from '@/lib/cache'
import { serializeGiftMedia } from '@/lib/media-url'
import { normalizeCatalogGift } from '@/lib/gift-admin'

// Get available gift types (kısa önbellek, fiyat sırası)
export async function GET() {
  try {
    const giftTypes = await getCachedGiftTypes()
    return NextResponse.json((giftTypes || []).map((g) => normalizeCatalogGift(serializeGiftMedia(g))), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error fetching gift types:', error)
    return NextResponse.json([], { status: 500 })
  }
}
