import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic'

// POST: Admin assigns a frame to a user
export async function POST(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { userId, frameId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const user = await prisma.user.update({
      where: { id: userId },
      data: { adminAssignedFrameId: frameId || null },
      select: { id: true, name: true, username: true, adminAssignedFrameId: true }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Assign frame error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
