import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/** DELETE /api/user/favorites/{id} — favoriyi kaldırır. */
export async function DELETE(req: NextRequest, { params }: { params: { favoriteId: string } }) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const id = params.favoriteId
    const existing = await prisma.userFavorite.findFirst({
      where: { id, userId: auth.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Favori bulunamadı' }, { status: 404 })
    }
    await prisma.userFavorite.delete({ where: { id: existing.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[User favorite DELETE] Error:', error)
    return NextResponse.json({ error: 'Favori kaldırılamadı' }, { status: 500 })
  }
}
