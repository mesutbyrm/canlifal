import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const WRITE_ROLES = ['admin', 'yonetici', 'finans']
const FULL_ROLES = ['admin', 'yonetici']
const CURRENCIES = ['all', 'jeton', 'cfc']
const SOURCE_TYPES = ['all', 'admin_credit', 'cfc_payment', 'package']

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session?.user?.id || !WRITE_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const data: any = {}

    if (body.label !== undefined) data.label = body.label ? String(body.label).slice(0, 80) : null
    if (body.minAmount !== undefined) {
      const v = Math.floor(Number(body.minAmount) || 0)
      if (v <= 0) return NextResponse.json({ error: 'Alt sınır 0\'dan büyük olmalı' }, { status: 400 })
      data.minAmount = v
    }
    if (body.bonusPercent !== undefined) {
      const v = Number(body.bonusPercent) || 0
      if (v <= 0 || v > 100) return NextResponse.json({ error: 'Bonus oranı %0-%100 arası olmalı' }, { status: 400 })
      data.bonusPercent = v
    }
    if (body.currency !== undefined && CURRENCIES.includes(body.currency)) data.currency = body.currency
    if (body.sourceType !== undefined && SOURCE_TYPES.includes(body.sourceType)) data.sourceType = body.sourceType
    if (body.maxBonus !== undefined) data.maxBonus = Math.max(0, Math.floor(Number(body.maxBonus) || 0))
    if (body.isActive !== undefined) data.isActive = !!body.isActive
    if (body.sortOrder !== undefined) data.sortOrder = Math.floor(Number(body.sortOrder) || 0)

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
    }

    const tier = await prisma.topupBonusTier.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, tier })
  } catch (error) {
    console.error('[bonus tier PATCH] error:', error)
    return NextResponse.json({ error: 'Kademe güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session?.user?.id || !FULL_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }
    await prisma.topupBonusTier.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[bonus tier DELETE] error:', error)
    return NextResponse.json({ error: 'Kademe silinemedi' }, { status: 500 })
  }
}
