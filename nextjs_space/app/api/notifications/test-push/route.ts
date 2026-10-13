import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { sendPushToUser } from '@/lib/onesignal'

export const dynamic = 'force-dynamic'

/** POST /api/notifications/test-push — oturumlu kullanıcıya test bildirimi. */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user?.id) {
      return NextResponse.json({ ok: false, error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const sent = await sendPushToUser(user.id, {
      title: 'Canlifal test',
      body: 'Push bildirimi çalışıyor.',
      type: 'test_push',
      targetPath: '/notifications',
    })

    if (!sent) {
      return NextResponse.json({
        ok: false,
        reason: 'push_not_sent',
        error: 'OneSignal yapılandırması yok veya abone cihaz bulunamadı',
      })
    }

    return NextResponse.json({ ok: true, success: true })
  } catch (e) {
    console.error('[notifications/test-push]', e)
    return NextResponse.json({ ok: false, error: 'Test push gönderilemedi' }, { status: 500 })
  }
}
