import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    if (!key) {
      return NextResponse.json({ error: 'Key required' }, { status: 400 })
    }

    // Only allow certain public settings
    const allowedKeys = ['chat_room_creation_cost']
    if (!allowedKeys.includes(key)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }

    const setting = await prisma.platformSettings.findUnique({ where: { key } })
    return NextResponse.json({ value: setting?.value || null })
  } catch (error) {
    console.error('Public settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
