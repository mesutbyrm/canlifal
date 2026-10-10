import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { sendTestPushDetailed } from '@/lib/onesignal'
import { pushProvider } from '@/lib/push'
import { fcmConfigInfo, sendFcmToUsers } from '@/lib/fcm'

export const dynamic = 'force-dynamic'

// POST /api/notifications/test-push — kendi hesabına test push gönderir.
// Yanıt: { ok, provider, reason?, devices, sent, failed, removedTokens, errors }
// (token, anahtar veya kişisel veri dönmez)
export async function POST(request: NextRequest) {
  const authUser = await authenticateRequest(request)
  if (!authUser?.id) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const provider = pushProvider()
  if (provider === 'onesignal') {
    const result = await sendTestPushDetailed(authUser.id)
    return NextResponse.json({ ...result, provider }, { status: result.ok ? 200 : 502 })
  }
  if (provider === 'off') {
    return NextResponse.json({ ok: false, provider, reason: 'Push sunucuda kapalı (PUSH_PROVIDER=off)' }, { status: 502 })
  }
  const cfg = fcmConfigInfo()
  if (!cfg.configured) {
    return NextResponse.json(
      { ok: false, provider, reason: 'FCM sunucuda yapılandırılmamış (FCM_SERVICE_ACCOUNT_BASE64 eksik)' },
      { status: 502 }
    )
  }
  const registered = await prisma.userDevice.count({ where: { userId: authUser.id } })
  const summary = await sendFcmToUsers([authUser.id], {
    title: 'Test bildirimi',
    body: 'Bildirimler çalışıyor 🎉',
    type: 'test',
    targetPath: '/notifications',
  })
  const ok = summary.sent > 0
  const reason = ok
    ? undefined
    : registered === 0
      ? 'Bu hesaba kayıtlı cihaz yok — uygulamada bildirim izni verip yeniden giriş yapın'
      : `FCM gönderemedi: ${JSON.stringify(summary.errors)}`
  return NextResponse.json(
    {
      ok,
      provider,
      projectId: cfg.projectId,
      reason,
      devices: summary.devices,
      sent: summary.sent,
      failed: summary.failed,
      removedTokens: summary.removedTokens,
      errors: summary.errors,
    },
    { status: ok ? 200 : 502 }
  )
}
