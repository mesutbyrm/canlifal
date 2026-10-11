/**
 * GET/PUT/DELETE /api/admin/integrations/google-play
 * Google Play Billing yapılandırması. Yalnız SÜPER ADMİN.
 * Service account JSON şifreli saklanır ve ASLA geri dönmez.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/rbac'
import { apiLimiter } from '@/lib/rate-limiter'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import {
  secretSource,
  setSecret,
  deleteSecret,
  getProviderConfig,
  setProviderConfig,
  deleteProviderConfig,
  invalidateIntegrationCache,
} from '@/lib/integration-secrets'
import { SECRET_MASK, vaultKeyStatus } from '@/lib/crypto-vault'
import { invalidateCache, getCachedPlatformSetting } from '@/lib/cache'
import { safeError } from '@/lib/log-redact'

export const dynamic = 'force-dynamic'

const SCOPE = 'google_play'
const PROVIDER = 'google_play'
const SA_FIELD = 'service_account_json'
const SA_ENV = 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON'
const PKG_FIELD = 'package_name'
const PKG_ENV = 'GOOGLE_PLAY_PACKAGE_NAME'
const MAP_KEY = 'store_products_map'

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard instanceof NextResponse) return guard
  try {
    const saSource = await secretSource(SCOPE, PROVIDER, SA_FIELD, SA_ENV)
    const pkg = (await getProviderConfig(PROVIDER, PKG_FIELD, PKG_ENV)) || ''
    const productsMap = await getCachedPlatformSetting(MAP_KEY, '{}')
    let productCount = 0
    try {
      productCount = Object.keys(JSON.parse(productsMap || '{}')).length
    } catch {
      productCount = -1
    }
    return NextResponse.json({
      success: true,
      data: {
        provider: 'google_play',
        label: 'Google Play Billing',
        vault: vaultKeyStatus(),
        configured: saSource !== 'none' && !!pkg,
        productsMap,
        productCount,
        fields: [
          {
            key: SA_FIELD,
            label: 'Service Account JSON',
            envName: SA_ENV,
            required: true,
            secret: true,
            source: saSource,
            hasValue: saSource !== 'none',
            masked: saSource === 'none' ? '' : SECRET_MASK,
          },
          {
            key: PKG_FIELD,
            label: 'Uygulama Paket Adı',
            envName: PKG_ENV,
            required: true,
            secret: false,
            source: pkg ? 'plain' : 'none',
            hasValue: !!pkg,
            value: pkg,
          },
        ],
      },
    })
  } catch (e) {
    safeError('admin-play', 'durum hatası', e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Durum alınamadı' } }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard instanceof NextResponse) return guard
  const { user } = guard
  const { success: ok } = apiLimiter.check(`int-play:${user.id}`)
  if (!ok) return NextResponse.json({ success: false, error: { code: 'RATE_LIMITED', message: 'Çok fazla istek' } }, { status: 429 })

  try {
    const body = await request.json().catch(() => ({}))
    const changed: string[] = []

    const sa = body?.[SA_FIELD]
    if (typeof sa === 'string' && sa.trim() && sa.trim() !== SECRET_MASK) {
      let parsed: any
      try {
        parsed = JSON.parse(sa.trim())
      } catch {
        return NextResponse.json({ success: false, error: { code: 'INVALID_JSON', message: 'Service account JSON geçerli bir JSON değil' } }, { status: 400 })
      }
      if (!parsed?.client_email || !parsed?.private_key) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_SERVICE_ACCOUNT', message: 'JSON içinde client_email ve private_key alanları bulunmalı' } }, { status: 400 })
      }
      await setSecret(SCOPE, PROVIDER, SA_FIELD, JSON.stringify(parsed), user.id)
      changed.push(SA_FIELD)
    }

    const pkg = body?.[PKG_FIELD]
    if (typeof pkg === 'string' && pkg.trim()) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(pkg.trim())) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_PACKAGE', message: 'Paket adı geçersiz' } }, { status: 400 })
      }
      await setProviderConfig(PROVIDER, PKG_FIELD, pkg.trim())
      changed.push(PKG_FIELD)
    }

    const map = body?.[MAP_KEY]
    if (typeof map === 'string' && map.trim()) {
      try {
        const obj = JSON.parse(map.trim())
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('not-object')
        for (const [pid, def] of Object.entries<any>(obj)) {
          if (!def || typeof def !== 'object' || !['jeton', 'cfc', 'membership'].includes(def.type)) {
            return NextResponse.json({ success: false, error: { code: 'INVALID_PRODUCT_MAP', message: `Geçersiz ürün tanımı: ${pid}` } }, { status: 400 })
          }
        }
        await prisma.platformSettings.upsert({
          where: { key: MAP_KEY },
          update: { value: JSON.stringify(obj) },
          create: { key: MAP_KEY, value: JSON.stringify(obj), description: 'Mağaza ürün eşlemesi (Google Play + App Store)' },
        })
        invalidateCache(`platform:${MAP_KEY}`)
        changed.push(MAP_KEY)
      } catch (err: any) {
        if (err?.message === 'not-object') {
          return NextResponse.json({ success: false, error: { code: 'INVALID_PRODUCT_MAP', message: 'Ürün eşlemesi bir nesne olmalı' } }, { status: 400 })
        }
        return NextResponse.json({ success: false, error: { code: 'INVALID_JSON', message: 'Ürün eşlemesi geçerli bir JSON değil' } }, { status: 400 })
      }
    }

    if (changed.length === 0) {
      return NextResponse.json({ success: false, error: { code: 'NO_CHANGES', message: 'Güncellenecek alan yok' } }, { status: 400 })
    }

    invalidateIntegrationCache()
    await recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'integration_google_play_update',
      targetType: 'IntegrationSecret',
      targetId: `${SCOPE}:${PROVIDER}`,
      description: `Google Play yapılandırması güncellendi: ${changed.join(', ')}`,
      metadata: { changed },
      ip: getAuditIp(request),
    })
    return NextResponse.json({ success: true, data: { changed } })
  } catch (e) {
    safeError('admin-play', 'kaydetme hatası', e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Kaydedilemedi' } }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard instanceof NextResponse) return guard
  const { user } = guard
  const confirm = request.nextUrl.searchParams.get('confirm')
  const field = request.nextUrl.searchParams.get('field') || SA_FIELD
  if (confirm !== 'DELETE') {
    return NextResponse.json({ success: false, error: { code: 'CONFIRMATION_REQUIRED', message: 'Silmek için ikinci onay gerekli' } }, { status: 400 })
  }
  if (![SA_FIELD, PKG_FIELD].includes(field)) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_FIELD', message: 'Geçersiz alan' } }, { status: 400 })
  }
  try {
    if (field === SA_FIELD) await deleteSecret(SCOPE, PROVIDER, SA_FIELD)
    else await deleteProviderConfig(PROVIDER, PKG_FIELD)
    invalidateIntegrationCache()
    const src = field === SA_FIELD
      ? await secretSource(SCOPE, PROVIDER, SA_FIELD, SA_ENV)
      : ((await getProviderConfig(PROVIDER, PKG_FIELD, PKG_ENV)) ? 'env' : 'none')
    await recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'integration_secret_delete',
      targetType: 'IntegrationSecret',
      targetId: `${SCOPE}:${PROVIDER}:${field}`,
      description: `Google Play alanı silindi: ${field}`,
      metadata: { scope: SCOPE, provider: PROVIDER, field, remainingSource: src },
      ip: getAuditIp(request),
    })
    return NextResponse.json({ success: true, data: { deleted: field, source: src } })
  } catch (e) {
    safeError('admin-play', 'silme hatası', e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Silinemedi' } }, { status: 500 })
  }
}
