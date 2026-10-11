import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

async function togglePin(req: NextRequest, fortuneId: string) {
  const auth = await authenticateRequest(req)
  if (!auth) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const fortune = await prisma.fortune.findFirst({
    where: { id: fortuneId, userId: auth.id },
    select: { id: true, isPinned: true },
  })
  if (!fortune) {
    return NextResponse.json({ error: 'Fal bulunamadı' }, { status: 404 })
  }
  const body = await req.json().catch(() => ({}))
  const next = typeof body?.isPinned === 'boolean' ? body.isPinned : !fortune.isPinned

  const updated = await prisma.fortune.update({
    where: { id: fortune.id },
    data: { isPinned: next, pinnedAt: next ? new Date() : null },
    select: { id: true, isPinned: true, pinnedAt: true },
  })
  return NextResponse.json({ success: true, ...updated, data: updated })
}

/** POST /api/user/fortunes/{id}/pin — sabitleme durumunu değiştirir. */
export async function POST(req: NextRequest, { params }: { params: { fortuneId: string } }) {
  try {
    return await togglePin(req, params.fortuneId)
  } catch (error) {
    console.error('[Fortune pin POST] Error:', error)
    return NextResponse.json({ error: 'Fal sabitlenemedi' }, { status: 500 })
  }
}

/** PATCH /api/user/fortunes/{id}/pin — POST ile aynı davranış. */
export async function PATCH(req: NextRequest, { params }: { params: { fortuneId: string } }) {
  try {
    return await togglePin(req, params.fortuneId)
  } catch (error) {
    console.error('[Fortune pin PATCH] Error:', error)
    return NextResponse.json({ error: 'Fal sabitlenemedi' }, { status: 500 })
  }
}
