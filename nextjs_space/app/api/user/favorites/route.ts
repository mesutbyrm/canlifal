import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET /api/user/favorites — kullanıcının favori listesi. */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const targetType = searchParams.get('targetType') || searchParams.get('type')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 200)

    const where: any = { userId: auth.id }
    if (targetType) where.targetType = targetType

    const items = await prisma.userFavorite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return NextResponse.json({ success: true, data: { items }, items })
  } catch (error) {
    console.error('[User favorites GET] Error:', error)
    return NextResponse.json({ error: 'Favoriler alınamadı' }, { status: 500 })
  }
}

/** POST /api/user/favorites — favori ekler (varsa günceller). */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const targetType = String(body?.targetType || body?.type || '').trim()
    const targetId = String(body?.targetId || body?.refId || '').trim()
    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'targetType ve targetId gerekli' }, { status: 400 })
    }
    const payload = {
      title: body?.title ? String(body.title) : null,
      url: body?.url ? String(body.url) : null,
      imageUrl: body?.imageUrl ? String(body.imageUrl) : null,
    }
    const favorite = await prisma.userFavorite.upsert({
      where: {
        userId_targetType_targetId: { userId: auth.id, targetType, targetId },
      },
      update: payload,
      create: { userId: auth.id, targetType, targetId, ...payload },
    })
    return NextResponse.json({ success: true, ...favorite, data: favorite })
  } catch (error) {
    console.error('[User favorites POST] Error:', error)
    return NextResponse.json({ error: 'Favori eklenemedi' }, { status: 500 })
  }
}
