import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Fetch active broadcast images (public for chat users)
export async function GET() {
  try {
    const images = await prisma.broadcastImage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        imageUrl: true
      }
    })
    return NextResponse.json(images)
  } catch (error) {
    console.error('Error fetching broadcast images:', error)
    return NextResponse.json([], { status: 200 })
  }
}
