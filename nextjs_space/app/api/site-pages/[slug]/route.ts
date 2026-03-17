import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const page = await prisma.sitePage.findUnique({
      where: { slug: params.slug, isPublished: true }
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json({ page })
  } catch (error) {
    console.error('Site page GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
