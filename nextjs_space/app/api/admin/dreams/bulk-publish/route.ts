import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || ((session.user as any).role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })
    }

    const { dreamIds, isPublished } = await req.json()
    if (!dreamIds || !Array.isArray(dreamIds) || dreamIds.length === 0 || typeof isPublished !== 'boolean') {
      return NextResponse.json({ error: 'dreamIds ve isPublished gerekli' }, { status: 400 })
    }

    const result = await prisma.dreamInterpretation.updateMany({
      where: { id: { in: dreamIds } },
      data: { isPublished },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Dream bulk publish error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
