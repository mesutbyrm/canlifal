import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { messageId: string } }) {
  try {
    const session = await getHybridSession(req)
    if (!session?.user?.id || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const updateData: Record<string, any> = {}

    if (body.text !== undefined) updateData.text = body.text.trim()
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder

    const message = await prisma.tickerMessage.update({
      where: { id: params.messageId },
      data: updateData,
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('Update ticker message error:', error)
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { messageId: string } }) {
  try {
    const session = await getHybridSession(req)
    if (!session?.user?.id || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    await prisma.tickerMessage.delete({
      where: { id: params.messageId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete ticker message error:', error)
    return NextResponse.json({ error: 'Silme başarısız' }, { status: 500 })
  }
}
