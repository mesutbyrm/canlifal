import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// Tek mesaj silme — yalnızca gönderen kendi mesajını silebilir.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; messageId: string } }
) {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const message = await prisma.directMessage.findUnique({
    where: { id: params.messageId },
    select: { id: true, senderId: true, receiverId: true },
  })
  if (!message) {
    return NextResponse.json({ error: 'Mesaj bulunamadı' }, { status: 404 })
  }
  const involves =
    (message.senderId === auth.id && message.receiverId === params.userId) ||
    (message.receiverId === auth.id && message.senderId === params.userId)
  if (!involves) {
    return NextResponse.json({ error: 'Bu mesaja erişiminiz yok' }, { status: 403 })
  }
  if (message.senderId !== auth.id) {
    return NextResponse.json({ error: 'Yalnızca kendi mesajınızı silebilirsiniz' }, { status: 403 })
  }
  await prisma.directMessage.delete({ where: { id: params.messageId } })
  return NextResponse.json({ success: true })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; messageId: string } }
) {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const message = await prisma.directMessage.findUnique({ where: { id: params.messageId } })
  if (!message || (message.senderId !== auth.id && message.receiverId !== auth.id)) {
    return NextResponse.json({ error: 'Mesaj bulunamadı' }, { status: 404 })
  }
  return NextResponse.json({ message })
}
