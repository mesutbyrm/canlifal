import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const celebrity = await prisma.celebrity.findUnique({
      where: { slug: params.slug },
    })
    if (!celebrity) {
      return NextResponse.json({ error: 'Ünlü bulunamadı' }, { status: 404 })
    }

    // Check existing follow
    const existingFollow = await prisma.celebrityFollow.findUnique({
      where: {
        userId_celebrityId: {
          userId: authUser.id,
          celebrityId: celebrity.id,
        },
      },
    })

    if (existingFollow) {
      // Unfollow
      await prisma.$transaction([
        prisma.celebrityFollow.delete({ where: { id: existingFollow.id } }),
        prisma.celebrity.update({
          where: { id: celebrity.id },
          data: { followerCount: { decrement: 1 } },
        }),
      ])
      return NextResponse.json({ followed: false, followerCount: celebrity.followerCount - 1 })
    } else {
      // Follow
      await prisma.$transaction([
        prisma.celebrityFollow.create({
          data: {
            userId: authUser.id,
            celebrityId: celebrity.id,
          },
        }),
        prisma.celebrity.update({
          where: { id: celebrity.id },
          data: { followerCount: { increment: 1 } },
        }),
      ])
      return NextResponse.json({ followed: true, followerCount: celebrity.followerCount + 1 })
    }
  } catch (error) {
    console.error('Error toggling celebrity follow:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
