import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST record a view (for logged-in users, used for recommendations)
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ ok: true }) // silent for anonymous
    }

    const dream = await prisma.dreamInterpretation.findUnique({
      where: { slug: params.slug, isPublished: true },
      select: { id: true },
    })
    if (!dream) {
      return NextResponse.json({ ok: true })
    }

    const userId = (session.user as any).id

    // Only record one view per user per dream per day
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const existingView = await prisma.dreamView.findFirst({
      where: {
        userId,
        dreamId: dream.id,
        createdAt: { gte: today },
      },
    })

    if (!existingView) {
      await prisma.dreamView.create({
        data: { userId, dreamId: dream.id },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Dream view record error:', error)
    return NextResponse.json({ ok: true })
  }
}
