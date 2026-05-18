export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - public endpoint to fetch active TikTok videos
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const videos = await prisma.tikTokVideo.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('TikTok videos fetch error:', error)
    return NextResponse.json({ videos: [] })
  }
}
