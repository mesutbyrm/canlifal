import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'
import {
  COMMISSION_SETTING_KEYS,
  COMMISSION_SETTING_DEFAULTS,
  COMMISSION_SETTING_LABELS,
  invalidateCommissionConfigCache,
} from '@/lib/referral-commission'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator', 'finans']
const WRITE_ROLES = ['admin', 'yonetici', 'finans']
const KEYS = Object.values(COMMISSION_SETTING_KEYS) as string[]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session?.user?.id || !(await staffCan(role, (session?.user as any)?.id, 'finance.report.view', ADMIN_ROLES))) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const rows = await prisma.platformSettings.findMany({ where: { key: { in: KEYS } } })
    const map = new Map(rows.map(r => [r.key, r.value]))
    const settings = KEYS.map(key => ({
      key,
      value: map.get(key) ?? COMMISSION_SETTING_DEFAULTS[key],
      defaultValue: COMMISSION_SETTING_DEFAULTS[key],
      label: COMMISSION_SETTING_LABELS[key] || key,
      isDefault: !map.has(key),
    }))

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[commission settings GET] error:', error)
    return NextResponse.json({ error: 'Ayarlar alınamadı' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session?.user?.id || !(await staffCan(role, (session?.user as any)?.id, 'finance.report.view', WRITE_ROLES))) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const incoming = (body?.settings || body) as Record<string, unknown>
    if (!incoming || typeof incoming !== 'object') {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
    }

    const updates: { key: string; value: string }[] = []
    for (const key of KEYS) {
      if (!(key in incoming)) continue
      const raw = incoming[key]
      let value: string
      if (typeof raw === 'boolean') value = raw ? 'true' : 'false'
      else value = String(raw ?? '').trim()

      if (key.endsWith('_enabled')) {
        value = value === 'true' || value === '1' ? 'true' : 'false'
      } else {
        const num = Number(value)
        if (!Number.isFinite(num) || num < 0) {
          return NextResponse.json({ error: `Geçersiz değer: ${COMMISSION_SETTING_LABELS[key] || key}` }, { status: 400 })
        }
        if (key.endsWith('_rate') && num > 100) {
          return NextResponse.json({ error: 'Komisyon oranı %100\'ü aşamaz' }, { status: 400 })
        }
        value = String(num)
      }
      updates.push({ key, value })
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Güncellenecek ayar yok' }, { status: 400 })
    }

    for (const u of updates) {
      await prisma.platformSettings.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value, description: COMMISSION_SETTING_LABELS[u.key] || u.key },
      })
    }

    invalidateCommissionConfigCache()

    return NextResponse.json({ success: true, updated: updates.length })
  } catch (error) {
    console.error('[commission settings PATCH] error:', error)
    return NextResponse.json({ error: 'Ayarlar kaydedilemedi' }, { status: 500 })
  }
}
