import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getStaffSession()
    if (!session?.user || !(await staffCan(((session.user as any).role || '').toLowerCase(), (session.user as any).id, 'content.announcement.manage', ['admin','yonetici','moderator']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { dreamIds } = await req.json()
    if (!Array.isArray(dreamIds) || dreamIds.length === 0) {
      return NextResponse.json({ error: 'dreamIds dizisi gerekli' }, { status: 400 })
    }

    const result = await prisma.dreamInterpretation.deleteMany({
      where: { id: { in: dreamIds } },
    })

    return NextResponse.json({ success: true, deletedCount: result.count })
  } catch (error) {
    console.error('Bulk dream delete error:', error)
    return NextResponse.json({ error: 'Toplu silme hatası' }, { status: 500 })
  }
}
