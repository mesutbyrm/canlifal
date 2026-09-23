import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Public GET — read hero text (returns empty string if cleared by admin)
export async function GET() {
  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key: 'canlidark_hero_text' }
    })
    // If setting exists, return its value (even if empty string = means admin cleared it)
    if (setting) {
      return NextResponse.json({ text: setting.value || '' })
    }
    // No setting yet = use default
    return NextResponse.json({ text: 'Canlı yayınlara\nkatıl, eğlenceye ortak ol!' })
  } catch {
    return NextResponse.json({ text: 'Canlı yayınlara\nkatıl, eğlenceye ortak ol!' })
  }
}
