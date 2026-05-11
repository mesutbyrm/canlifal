import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCachedPlatformSetting } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// Public GET — read hero text
export async function GET() {
  try {
    const text = await getCachedPlatformSetting(
      'canlidark_hero_text',
      'Canlı yayınlara\nkatıl, eğlenceye ortak ol!'
    )
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ text: 'Canlı yayınlara\nkatıl, eğlenceye ortak ol!' })
  }
}
