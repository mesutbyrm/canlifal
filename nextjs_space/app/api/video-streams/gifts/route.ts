import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { getCachedGiftTypes } from '@/lib/cache'

// Get available gift types (cached - 10min TTL)
export async function GET() {
  try {
    const giftTypes = await getCachedGiftTypes()
    return NextResponse.json(giftTypes)
  } catch (error) {
    console.error('Error fetching gift types:', error)
    return NextResponse.json([], { status: 500 })
  }
}
