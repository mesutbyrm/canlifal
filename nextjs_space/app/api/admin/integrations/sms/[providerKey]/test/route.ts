/**
 * POST /api/admin/integrations/sms/:providerKey/test
 * body: { mode: 'connection' | 'balance' | 'sms', phone?: string }
 *
 * 'connection' → mümkünse SMS göndermeden gerçek kimlik/bakiye ucu ile test.
 * 'sms'        → gerçek test SMS'i (yalnız SÜPER ADMİN, denetim kaydı tutulur).
 * OTP kodu veya gizli bilgi ASLA loglanmaz / dönülmez.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/rbac'
import { authLimiter } from '@/lib/rate-limiter'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { getProviderMeta } from '@/lib/sms/catalog'
import { testProviderConnection, checkProviderBalance, sendSmsMessage } from '@/lib/sms/service'
import { normalizePhone } from '@/lib/sms'
import { maskPhone, safeError } from '@/lib/log-redact'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { providerKey: string } }) {
  const guard = await requireSuperAdmin(request)
  if (guard instanceof NextResponse) return guard
  const { user } = guard
  const providerKey = params.providerKey
  const meta = getProviderMeta(providerKey)
  if (!meta) return NextResponse.json({ success: false, error: { code: 'UNKNOWN_PROVIDER', message: 'Bilinmeyen sağlayıcı' } }, { status: 404 })

  const { success: ok } = authLimiter.check(`int-sms-test:${user.id}`)
  if (!ok) return NextResponse.json({ success: false, error: { code: 'RATE_LIMITED', message: 'Çok fazla test isteği' } }, { status: 429 })

  try {
    const body = await request.json().catch(() => ({}))
    const mode = String(body?.mode || 'connection')

    if (mode === 'balance') {
      const r = await checkProviderBalance(providerKey)
      await recordAudit({
        actorId: user.id, actorRole: user.role, action: 'integration_sms_balance_check',
        targetType: 'SmsProvider', targetId: providerKey,
        metadata: { ok: r.ok, supported: r.supported, errorCode: r.errorCode || null },
        ip: getAuditIp(request),
      })
      return NextResponse.json({ success: true, data: { ok: r.ok, supported: r.supported, balance: r.balance || null, errorCode: r.errorCode || null } })
    }

    if (mode === 'sms') {
      const phone = normalizePhone(String(body?.phone || ''))
      if (!phone || phone.length < 8) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_PHONE', message: 'Geçerli bir test numarası girin' } }, { status: 400 })
      }
      const out = await sendSmsMessage(phone, 'CanliFal test mesaji. Bu bir dogrulama kodu degildir.', {
        purpose: 'admin_test', isTest: true, forceProvider: providerKey,
      })
      await recordAudit({
        actorId: user.id, actorRole: user.role, action: 'integration_sms_test_send',
        targetType: 'SmsProvider', targetId: providerKey,
        metadata: { phone: maskPhone(phone), ok: out.ok, errorCode: out.errorCode || null },
        description: `Test SMS gönderildi: ${meta.displayName}`,
        ip: getAuditIp(request),
      })
      return NextResponse.json({ success: true, data: { ok: out.ok, errorCode: out.errorCode || null, providerMessageId: out.providerMessageId || null } })
    }

    const r = await testProviderConnection(providerKey)
    await recordAudit({
      actorId: user.id, actorRole: user.role, action: 'integration_sms_connection_test',
      targetType: 'SmsProvider', targetId: providerKey,
      metadata: { ok: r.ok, live: r.live, errorCode: r.errorCode || null },
      ip: getAuditIp(request),
    })
    return NextResponse.json({
      success: true,
      data: {
        ok: r.ok,
        live: r.live,
        errorCode: r.errorCode || null,
        note: r.live ? 'Sağlayıcı ucuna gerçek bağlantı yapıldı.' : 'Bu sağlayıcı SMS göndermeden test edilemiyor; yalnız yapılandırma doğrulandı.',
      },
    })
  } catch (e) {
    safeError('admin-sms', 'test hatası', e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Test çalıştırılamadı' } }, { status: 500 })
  }
}
