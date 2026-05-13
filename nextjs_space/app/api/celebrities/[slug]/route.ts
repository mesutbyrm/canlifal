import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const celebrity = await prisma.celebrity.findUnique({
      where: { slug: params.slug },
    })

    if (!celebrity || !celebrity.isActive) {
      return NextResponse.json({ error: 'Ünlü bulunamadı' }, { status: 404 })
    }

    const session = await getServerSession(authOptions)
    let isFollowed = false
    if (session?.user?.id) {
      const follow = await prisma.celebrityFollow.findUnique({
        where: {
          userId_celebrityId: {
            userId: session.user.id,
            celebrityId: celebrity.id,
          },
        },
      })
      isFollowed = !!follow
    }

    return NextResponse.json({
      celebrity: {
        ...celebrity,
        socialLinks: celebrity.socialLinks ? JSON.parse(celebrity.socialLinks) : {},
        achievements: celebrity.achievements ? JSON.parse(celebrity.achievements) : [],
        isFollowed,
      },
    })
  } catch (error) {
    console.error('Error fetching celebrity:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
