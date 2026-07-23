import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!session?.user?.id || !['admin', 'yonetici'].includes(role)) return null
  return session
}

// GET — list all lucky gift tiers (+ computed odds)
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })

  const tiers = await prisma.luckyGiftTier.findMany({
    orderBy: [{ sortOrder: 'asc' }, { multiplier: 'asc' }],
  })

  const totalWeight = tiers.filter(t => t.isActive).reduce((s, t) => s + (t.weight || 0), 0) || 1
  const withOdds = tiers.map(t => ({
    ...t,
    oddsPercent: t.isActive ? Math.round((t.weight / totalWeight) * 10000) / 100 : 0,
  }))

  // Expected return ratio (RTP) across active tiers
  const rtp = tiers
    .filter(t => t.isActive)
    .reduce((s, t) => s + (t.weight / totalWeight) * t.multiplier, 0)

  return NextResponse.json({ tiers: withOdds, totalWeight, rtp: Math.round(rtp * 100) / 100 })
}

// POST — create a tier
export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })

  const body = await request.json()
  const { name, nameEn, multiplier, weight, isJackpot, color, icon, isActive, sortOrder } = body

  if (!name || multiplier == null || Number(multiplier) < 0) {
    return NextResponse.json({ error: 'İsim ve geçerli çarpan gerekli' }, { status: 400 })
  }

  const tier = await prisma.luckyGiftTier.create({
    data: {
      name: String(name),
      nameEn: nameEn ? String(nameEn) : '',
      multiplier: Math.max(0, parseInt(multiplier)),
      weight: Math.max(0, parseInt(weight) || 1),
      isJackpot: !!isJackpot,
      color: color || null,
      icon: icon || null,
      isActive: isActive !== false,
      sortOrder: parseInt(sortOrder) || 0,
    },
  })

  return NextResponse.json({ success: true, tier })
}

// PATCH — update a tier (bumps contentVersion)
export async function PATCH(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })

  const body = await request.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

  const data: any = {}
  if (rest.name != null) data.name = String(rest.name)
  if (rest.nameEn != null) data.nameEn = String(rest.nameEn)
  if (rest.multiplier != null) data.multiplier = Math.max(0, parseInt(rest.multiplier))
  if (rest.weight != null) data.weight = Math.max(0, parseInt(rest.weight))
  if (rest.isJackpot != null) data.isJackpot = !!rest.isJackpot
  if (rest.color !== undefined) data.color = rest.color || null
  if (rest.icon !== undefined) data.icon = rest.icon || null
  if (rest.isActive != null) data.isActive = !!rest.isActive
  if (rest.sortOrder != null) data.sortOrder = parseInt(rest.sortOrder) || 0
  data.contentVersion = { increment: 1 }

  const tier = await prisma.luckyGiftTier.update({ where: { id }, data })
  return NextResponse.json({ success: true, tier })
}

// DELETE — remove a tier
export async function DELETE(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

  await prisma.luckyGiftTier.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
