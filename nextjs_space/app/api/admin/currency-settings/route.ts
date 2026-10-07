import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'
import {
  CURRENCY_SETTING_KEYS,
  CURRENCY_SETTING_DEFAULTS,
  CURRENCY_SETTING_LABELS,
  invalidateCurrencyBrandingCache,
} from '@/lib/currency-branding'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator', 'finans']
const WRITE_ROLES = ['admin', 'yonetici', 'finans']
const KEYS = Object.values(CURRENCY_SETTING_KEYS) as string[]

export async function GET(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    const role = (session?.user as any)?.role
    if (!session?.user?.id || !(await staffCan(role, (session?.user as any)?.id, 'finance.report.view', ADMIN_ROLES))) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const rows = await prisma.platformSettings.findMany({ where: { key: { in: KEYS } } })
    const map = new Map(rows.map((r) => [r.key, r.value]))
    const settings = KEYS.map((key) => ({
      key,
      value: map.get(key) ?? CURRENCY_SETTING_DEFAULTS[key],
      defaultValue: CURRENCY_SETTING_DEFAULTS[key],
      label: CURRENCY_SETTING_LABELS[key] || key,
      isDefault: !map.has(key),
    }))

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[currency settings GET] error:', error)
    return NextResponse.json({ error: 'Ayarlar alınamadı' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
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
      const value = String(incoming[key] ?? '').trim()
      if (!value) {
        return NextResponse.json(
          { error: `${CURRENCY_SETTING_LABELS[key] || key} boş bırakılamaz` },
          { status: 400 }
        )
      }
      if (key.endsWith('_name') || key.endsWith('_name_en')) {
        if (value.length > 24) {
          return NextResponse.json({ error: 'Para birimi adı en fazla 24 karakter olabilir' }, { status: 400 })
        }
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
        create: { key: u.key, value: u.value, description: CURRENCY_SETTING_LABELS[u.key] || u.key },
      })
    }

    invalidateCurrencyBrandingCache()

    return NextResponse.json({ success: true, updated: updates.length })
  } catch (error) {
    console.error('[currency settings PATCH] error:', error)
    return NextResponse.json({ error: 'Ayarlar kaydedilemedi' }, { status: 500 })
  }
}
