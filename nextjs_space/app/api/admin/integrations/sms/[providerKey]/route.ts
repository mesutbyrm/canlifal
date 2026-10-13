/**
 * PATCH  /api/admin/integrations/sms/:providerKey → aktif/pasif + öncelik
 * PUT    /api/admin/integrations/sms/:providerKey → alan değerlerini kaydeder
 *        (secret alanlar şifrelenerek, diğerleri düz saklanır)
 * DELETE /api/admin/integrations/sms/:providerKey?field=xxx&confirm=DELETE
 *
 * Yalnız SÜPER ADMİN. Hiçbir secret değeri yanıtta dönmez, audit'e yazılmaz.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/rbac'
import { apiLimiter } from '@/lib/rate-limiter'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import prisma from '@/lib/db'
import { getProviderMeta } from '@/lib/sms/catalog'
import { providerConfigStatus } from '@/lib/sms/service'
import {
  setSecret, deleteSecret, setProviderConfig, deleteProviderConfig, invalidateIntegrationCache,
} from '@/lib/integration-secrets'
import { safeError } from '@/lib/log-redact'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { providerKey: string } }) {
  const guard = await requireSuperAdmin(request)
  if (guard instanceof NextResponse) return guard
  const { user } = guard
  const providerKey = params.providerKey
  const meta = getProviderMeta(providerKey)
  if (!meta) return NextResponse.json({ success: false, error: { code: 'UNKNOWN_PROVIDER', message: 'Bilinmeyen sağlayıcı' } }, { status: 404 })

  const { success: ok } = apiLimiter.check(`int-sms-patch:${user.id}`)
  if (!ok) return NextResponse.json({ success: false, error: { code: 'RATE_LIMITED', message: 'Çok fazla istek' } }, { status: 429 })

  try {
    const body = await request.json().catch(() => ({}))
    const data: any = {}
    if (body.enabled !== undefined) {
      if (body.enabled === true && !meta.implemented) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Bu sağlayıcı için doğrulanmış entegrasyon bulunmuyor' } },
          { status: 400 }
        )
      }
      data.enabled = !!body.enabled
    }
    if (body.priority !== undefined) {
      const p = Number(body.priority)
      if (!Number.isFinite(p) || p < 1 || p > 999) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_PRIORITY', message: 'Öncelik 1-999 arası olmalı' } }, { status: 400 })
      }
      data.priority = Math.round(p)
    }
    if (!Object.keys(data).length) {
      return NextResponse.json({ success: false, error: { code: 'NO_CHANGES', message: 'Değişiklik yok' } }, { status: 400 })
    }

    const before = await prisma.smsProvider.findUnique({ where: { providerKey } })
    await prisma.smsProvider.upsert({
      where: { providerKey },
      create: { providerKey, displayName: meta.displayName, enabled: data.enabled ?? false, priority: data.priority ?? 100 },
      update: data,
    })
    await recordAudit({
      actorId: user.id, actorRole: user.role,
      action: 'integration_sms_provider_update',
      targetType: 'SmsProvider', targetId: providerKey,
      before: before ? { enabled: before.enabled, priority: before.priority } : null,
      after: data,
      description: `SMS sağlayıcı güncellendi: ${meta.displayName}`,
      ip: getAuditIp(request),
    })
    return NextResponse.json({ success: true, data: await providerConfigStatus(providerKey) })
  } catch (e) {
    safeError('admin-sms', 'sağlayıcı güncelleme hatası', e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Güncellenemedi' } }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { providerKey: string } }) {
  const guard = await requireSuperAdmin(request)
  if (guard instanceof NextResponse) return guard
  const { user } = guard
  const providerKey = params.providerKey
  const meta = getProviderMeta(providerKey)
  if (!meta) return NextResponse.json({ success: false, error: { code: 'UNKNOWN_PROVIDER', message: 'Bilinmeyen sağlayıcı' } }, { status: 404 })

  const { success: ok } = apiLimiter.check(`int-sms-put:${user.id}`)
  if (!ok) return NextResponse.json({ success: false, error: { code: 'RATE_LIMITED', message: 'Çok fazla istek' } }, { status: 429 })

  try {
    const body = await request.json().catch(() => ({}))
    const fields = body?.fields && typeof body.fields === 'object' ? body.fields : {}
    const savedKeys: string[] = []
    for (const f of meta.fields) {
      const raw = fields[f.key]
      if (raw === undefined || raw === null) continue
      const value = String(raw)
      // Maskeli değer geri gönderildiyse: değişiklik yok say.
      if (/^\*+$/.test(value.trim())) continue
      if (!value.trim()) continue
      if (f.secret) await setSecret('sms', providerKey, f.key, value, user.id)
      else await setProviderConfig(providerKey, f.key, value)
      savedKeys.push(f.key)
    }
    if (!savedKeys.length) {
      return NextResponse.json({ success: false, error: { code: 'NO_CHANGES', message: 'Kaydedilecek alan yok' } }, { status: 400 })
    }
    invalidateIntegrationCache('sms', providerKey)

    // Sağlayıcı satırı yoksa oluştur (pasif olarak).
    await prisma.smsProvider.upsert({
      where: { providerKey },
      create: { providerKey, displayName: meta.displayName, enabled: false, priority: 100 },
      update: {},
    })

    await recordAudit({
      actorId: user.id, actorRole: user.role,
      action: 'integration_secret_update',
      targetType: 'SmsProvider', targetId: providerKey,
      // DEĞERLER ASLA yazılmaz — yalnız alan adları.
      metadata: { fields: savedKeys },
      description: `SMS sağlayıcı yapılandırması güncellendi: ${meta.displayName}`,
      ip: getAuditIp(request),
    })
    return NextResponse.json({ success: true, data: { saved: savedKeys, status: await providerConfigStatus(providerKey) } })
  } catch (e) {
    safeError('admin-sms', 'yapılandırma kaydetme hatası', e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Kaydedilemedi' } }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { providerKey: string } }) {
  const guard = await requireSuperAdmin(request)
  if (guard instanceof NextResponse) return guard
  const { user } = guard
  const providerKey = params.providerKey
  const meta = getProviderMeta(providerKey)
  if (!meta) return NextResponse.json({ success: false, error: { code: 'UNKNOWN_PROVIDER', message: 'Bilinmeyen sağlayıcı' } }, { status: 404 })

  const url = new URL(request.url)
  const field = url.searchParams.get('field') || ''
  const confirm = url.searchParams.get('confirm') || ''
  if (confirm !== 'DELETE') {
    return NextResponse.json(
      { success: false, error: { code: 'CONFIRM_REQUIRED', message: 'Silme işlemi için ikinci onay gerekiyor' } },
      { status: 400 }
    )
  }

  try {
    const targets = field ? meta.fields.filter((f) => f.key === field) : meta.fields
    if (!targets.length) {
      return NextResponse.json({ success: false, error: { code: 'UNKNOWN_FIELD', message: 'Bilinmeyen alan' } }, { status: 404 })
    }
    const removed: string[] = []
    for (const f of targets) {
      if (f.secret) { if (await deleteSecret('sms', providerKey, f.key)) removed.push(f.key) }
      else { await deleteProviderConfig(providerKey, f.key); removed.push(f.key) }
    }
    invalidateIntegrationCache('sms', providerKey)

    // Yapılandırma eksik kaldıysa sağlayıcı otomatik devre dışı bırakılır.
    const status = await providerConfigStatus(providerKey)
    if (!status.configured) {
      await prisma.smsProvider.updateMany({ where: { providerKey }, data: { enabled: false } })
    }

    await recordAudit({
      actorId: user.id, actorRole: user.role,
      action: 'integration_secret_delete',
      targetType: 'SmsProvider', targetId: providerKey,
      metadata: { fields: removed, autoDisabled: !status.configured },
      description: `SMS sağlayıcı gizli bilgisi silindi: ${meta.displayName}`,
      ip: getAuditIp(request),
    })
    return NextResponse.json({ success: true, data: { removed, configured: status.configured, autoDisabled: !status.configured } })
  } catch (e) {
    safeError('admin-sms', 'silme hatası', e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Silinemedi' } }, { status: 500 })
  }
}
