import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireFullAdmin, resolveUser } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

/**
 * Sahte (bonus) jeton yönetimi — yalnız tam yönetici (admin / yonetici).
 *
 * GET    -> kullanıcının gerçek + sahte bakiyesi
 * POST   { amount }  -> sahte jeton ekler (negatif değer düşer, 0'ın altına inmez)
 * PUT    { amount }  -> sahte jeton bakiyesini doğrudan ayarlar
 *
 * Sahte jeton harcandığında kar/zarara işlemez, alıcıya gerçek bakiye geçmez,
 * paraya çevrilemez ve çekilemez; yalnızca puan/XP etkilerini tetikler.
 */

async function loadUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, jetonBalance: true, fakeJetonBalance: true },
  })
}

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const denied = await requireFullAdmin(request)
  if (denied) return denied
  const user = await loadUser(params.userId)
  if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
  return NextResponse.json({ success: true, user })
}

async function applyChange(
  request: NextRequest,
  userId: string,
  mode: 'increment' | 'set'
) {
  const denied = await requireFullAdmin(request)
  if (denied) return denied

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 })
  }

  const amount = Number(body?.amount)
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    return NextResponse.json({ error: 'amount tam sayı olmalı' }, { status: 400 })
  }
  if (mode === 'set' && amount < 0) {
    return NextResponse.json({ error: 'amount negatif olamaz' }, { status: 400 })
  }

  const target = await loadUser(userId)
  if (!target) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

  const next =
    mode === 'set' ? amount : Math.max(0, (target.fakeJetonBalance ?? 0) + amount)

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { fakeJetonBalance: next },
    select: { id: true, name: true, email: true, jetonBalance: true, fakeJetonBalance: true },
  })

  const actor = await resolveUser(request)
  console.log(
    `[fake-jeton] ${actor?.email ?? actor?.id ?? 'bilinmeyen'} -> ${userId}: ${
      target.fakeJetonBalance ?? 0
    } => ${next} (${mode})`
  )

  return NextResponse.json({
    success: true,
    user: updated,
    previousFakeJetonBalance: target.fakeJetonBalance ?? 0,
  })
}

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  return applyChange(request, params.userId, 'increment')
}

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  return applyChange(request, params.userId, 'set')
}
