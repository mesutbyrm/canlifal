/**
 * GET/PUT/DELETE /api/admin/integrations/apple
 * Apple IAP paylaşılan sırrının yönetimi. Yalnız SÜPER ADMİN.
 * Secret DEĞERİ hiçbir zaman dönmez; yalnız kaynak + maskeli gösterim.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/rbac'
import { apiLimiter } from '@/lib/rate-limiter'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { secretSource, setSecret, deleteSecret, invalidateIntegrationCache } from '@/lib/integration-secrets'
import { SECRET_MASK, vaultKeyStatus } from '@/lib/crypto-vault'
import { safeError } from '@/lib/log-redact'

export const dynamic = 'force-dynamic'

const SCOPE = 'apple'
const PROVIDER = 'apple_iap'
const FIELD = 'shared_secret'
const ENV_NAME = 'APPLE_IAP_SHARED_SECRET'

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard instanceof NextResponse) return guard
  try {
    const src = await secretSource(SCOPE, PROVIDER, FIELD, ENV_NAME)
    return NextResponse.json({
      success: true,
      data: {
        provider: 'apple_iap',
        label: 'Apple In-App Purchase',
        vault: vaultKeyStatus(),
        configured: src !== 'none',
        fields: [
          {
            key: FIELD,
            label: 'App Store Shared Secret',
            envName: ENV_NAME,
            required: true,
            secret: true,
            source: src,
            hasValue: src !== 'none',
            masked: src === 'none' ? '' : SECRET_MASK,
          },
        ],
      },
    })
  } catch (e) {
    safeError('admin-apple', 'durum hatası', e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Durum alınamadı' } }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard instanceof NextResponse) return guard
  const { user } = guard
  const { success: ok } = apiLimiter.check(`int-apple:${user.id}`)
  if (!ok) return NextResponse.json({ success: false, error: { code: 'RATE_LIMITED', message: 'Çok fazla istek' } }, { status: 429 })

  try {
    const body = await request.json().catch(() => ({}))
    const raw = body?.[FIELD]
    if (typeof raw !== 'string' || !raw.trim() || raw.trim() === SECRET_MASK) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_VALUE', message: 'Geçerli bir değer girin' } }, { status: 400 })
    }
    await setSecret(SCOPE, PROVIDER, FIELD, raw.trim(), user.id)
    invalidateIntegrationCache()
    await recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'integration_secret_set',
      targetType: 'IntegrationSecret',
      targetId: `${SCOPE}:${PROVIDER}:${FIELD}`,
      description: 'Apple IAP shared secret güncellendi',
      metadata: { scope: SCOPE, provider: PROVIDER, field: FIELD },
      ip: getAuditIp(request),
    })
    return NextResponse.json({ success: true, data: { field: FIELD, masked: SECRET_MASK } })
  } catch (e) {
    safeError('admin-apple', 'kaydetme hatası', e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Kaydedilemedi' } }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard instanceof NextResponse) return guard
  const { user } = guard
  const confirm = request.nextUrl.searchParams.get('confirm')
  if (confirm !== 'DELETE') {
    return NextResponse.json({ success: false, error: { code: 'CONFIRMATION_REQUIRED', message: 'Silmek için ikinci onay gerekli' } }, { status: 400 })
  }
  try {
    await deleteSecret(SCOPE, PROVIDER, FIELD)
    invalidateIntegrationCache()
    const src = await secretSource(SCOPE, PROVIDER, FIELD, ENV_NAME)
    await recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'integration_secret_delete',
      targetType: 'IntegrationSecret',
      targetId: `${SCOPE}:${PROVIDER}:${FIELD}`,
      description: 'Apple IAP shared secret silindi',
      metadata: { scope: SCOPE, provider: PROVIDER, field: FIELD, remainingSource: src },
      ip: getAuditIp(request),
    })
    return NextResponse.json({ success: true, data: { deleted: FIELD, source: src } })
  } catch (e) {
    safeError('admin-apple', 'silme hatası', e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Silinemedi' } }, { status: 500 })
  }
}
