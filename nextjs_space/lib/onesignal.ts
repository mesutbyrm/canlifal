// OneSignal Server-Side Helper - Send push notifications via REST API
// Compatible with Flutter mobile app (OneSignal.login(userId) → external_id)

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || ''
const ONESIGNAL_API_URL = 'https://api.onesignal.com'

interface PushPayload {
  title: string
  body: string
  type: string
  targetPath?: string
  targetId?: string
  urgent?: boolean
}

/**
 * Send a push notification to a specific user via OneSignal REST API.
 * Uses external_id (our DB user id) — Flutter calls OneSignal.login(userId).
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.warn('OneSignal credentials not configured, skipping push notification')
    return false
  }

  try {
    const notifBody: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      target_channel: 'push',
      include_aliases: { external_id: [userId] },
      headings: { en: payload.title, tr: payload.title },
      contents: { en: payload.body, tr: payload.body },
      data: {
        type: payload.type,
        targetPath: payload.targetPath || '',
        targetId: payload.targetId || '',
        title: payload.title,
        body: payload.body,
      },
      chrome_web_icon: '/logo.png',
      firefox_icon: '/logo.png',
    }

    // Urgent notifications: high priority, custom Android channel
    if (payload.urgent) {
      notifBody.priority = 10
      notifBody.android_channel_id = 'canlifal_urgent'
      notifBody.ios_interruption_level = 'active'
    }

    const response = await fetch(`${ONESIGNAL_API_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notifBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OneSignal push failed:', response.status, errorData)
      return false
    }

    const result = await response.json()
    console.log('OneSignal push sent:', result.id)
    return true
  } catch (error) {
    console.error('OneSignal push error:', error)
    return false
  }
}

/**
 * Send push notification to multiple users at once.
 * Max ~2000 external_ids per call (OneSignal limit).
 */
export async function sendPushToMultipleUsers(
  userIds: string[],
  payload: PushPayload
): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY || userIds.length === 0) {
    return false
  }

  try {
    const notifBody: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      target_channel: 'push',
      include_aliases: { external_id: userIds },
      headings: { en: payload.title, tr: payload.title },
      contents: { en: payload.body, tr: payload.body },
      data: {
        type: payload.type,
        targetPath: payload.targetPath || '',
        targetId: payload.targetId || '',
        title: payload.title,
        body: payload.body,
      },
      chrome_web_icon: '/logo.png',
      firefox_icon: '/logo.png',
    }

    if (payload.urgent) {
      notifBody.priority = 10
      notifBody.android_channel_id = 'canlifal_urgent'
      notifBody.ios_interruption_level = 'active'
    }

    const response = await fetch(`${ONESIGNAL_API_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notifBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OneSignal push to many failed:', response.status, errorData)
      return false
    }

    return true
  } catch (error) {
    console.error('OneSignal push to many error:', error)
    return false
  }
}

// ── Legacy aliases (backward compat for existing code) ──────────────────

interface OneSignalNotificationPayload {
  userId: string
  title: string
  message: string
  url?: string
  data?: Record<string, any>
}

/**
 * @deprecated Use sendPushToUser instead. Kept for backward compatibility.
 */
export async function sendOneSignalPush(payload: OneSignalNotificationPayload): Promise<boolean> {
  return sendPushToUser(payload.userId, {
    title: payload.title,
    body: payload.message,
    type: payload.data?.type || 'general',
    targetPath: payload.data?.targetPath || '',
    targetId: payload.data?.targetId || '',
    urgent: false,
  })
}

/**
 * @deprecated Use sendPushToMultipleUsers instead. Kept for backward compatibility.
 */
export async function sendOneSignalPushToMany(
  userIds: string[],
  title: string,
  message: string,
  url?: string,
  data?: Record<string, any>
): Promise<boolean> {
  return sendPushToMultipleUsers(userIds, {
    title,
    body: message,
    type: data?.type || 'general',
    targetPath: data?.targetPath || '',
    targetId: data?.targetId || '',
    urgent: false,
  })
}

/**
 * Get notification title based on notification type.
 */
export function getNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    'like': '❤️ Yeni Beğeni',
    'comment': '💬 Yeni Yorum',
    'share': '🔄 Paylaşıldı',
    'session_request': '🔮 Yeni Seans Talebi',
    'session_update': '📺 Seans Güncellendi',
    'payment_notification': '💰 Ödeme Bildirimi',
    'payment_approved': '✅ Ödeme Onaylandı',
    'payment_rejected': '❌ Ödeme Reddedildi',
    'cfc_payment_request': '💰 CFC Ödeme Talebi',
    'cfc_payment_approved': '✅ CFC Yükleme Onaylandı',
    'cfc_payment_rejected': '❌ CFC Yükleme Reddedildi',
    'jeton_payment_request': '💰 Jeton Ödeme Talebi',
    'jeton_payment_approved': '✅ Jeton Yükleme Onaylandı',
    'jeton_payment_rejected': '❌ Jeton Yükleme Reddedildi',
    'gift': '🎁 Yeni Hediye',
    'follow': '👤 Yeni Takipçi',
    'unfollow': '👤 Takipten Çıkıldı',
    'profile_view': '👁️ Profil Görüntüleme',
    'message': '✉️ Yeni Mesaj',
    'stream_start': '🔴 Canlı Yayın',
    'stream_live': '🔴 Canlı Yayın',
    'live': '🔴 Canlı Yayın',
    'co_broadcast_invite': '📹 Ortak Yayın Daveti',
    'achievement': '🏆 Yeni Başarım',
    'contest_result': '🎉 Yarışma Sonucu',
    'new_blog': '📝 Yeni Blog Yazısı',
    'moderation': '⚠️ Moderasyon Bildirimi',
  }
  return titles[type] || '🔔 Yeni Bildirim'
}

/**
 * Get notification URL based on notification type (for web push).
 */
export function getNotificationUrl(type: string, data?: Record<string, any>): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'

  if (type === 'payment_notification' || type === 'payment_approved' || type === 'payment_rejected') {
    return `${baseUrl}/uyelik`
  }
  if (type === 'cfc_payment_approved' || type === 'cfc_payment_rejected') {
    return `${baseUrl}/cfc-store`
  }
  if (type === 'jeton_payment_approved' || type === 'jeton_payment_rejected') {
    return `${baseUrl}/jeton-yukle`
  }
  if (type === 'cfc_payment_request' || type === 'jeton_payment_request') {
    return `${baseUrl}/admin`
  }
  if (type === 'session_request' || type === 'session_update') {
    return data?.sessionId ? `${baseUrl}/canli-oda/${data.sessionId}` : `${baseUrl}/panel`
  }
  if (type === 'like' || type === 'comment' || type === 'share') {
    return data?.postId ? `${baseUrl}/sosyal?postId=${data.postId}` : `${baseUrl}/sosyal`
  }
  if (type === 'follow' || type === 'unfollow') {
    return data?.followerId ? `${baseUrl}/profil/${data.followerId}` : `${baseUrl}/sosyal`
  }
  if (type === 'profile_view') {
    return data?.viewerId ? `${baseUrl}/profil/${data.viewerId}` : `${baseUrl}/panel`
  }
  if (type === 'message') {
    return data?.senderId ? `${baseUrl}/mesajlar/${data.senderId}` : `${baseUrl}/mesajlar`
  }
  if (type === 'stream_start' || type === 'stream_live' || type === 'live') {
    return data?.streamId ? `${baseUrl}/sohbet/video?stream=${data.streamId}` : `${baseUrl}/sohbet/video`
  }
  if (type === 'achievement') {
    return `${baseUrl}/basarimlar`
  }
  if (type === 'contest_result') {
    return `${baseUrl}/ruya-yarismasi`
  }
  if (type === 'new_blog') {
    return `${baseUrl}/blog`
  }
  if (type === 'moderation') {
    return `${baseUrl}/panel`
  }
  return `${baseUrl}/panel`
}

/**
 * Tanılama: kendi hesabına test bildirimi gönderir ve OneSignal'in ham yanıtını döner
 * (kimlik bilgisi eksik mi, bu external_id'ye abone cihaz var mı, vb.).
 */
export async function sendTestPushDetailed(userId: string): Promise<{
  ok: boolean
  reason?: string
  status?: number
  response?: any
  appIdSuffix?: string
}> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return {
      ok: false,
      reason: !ONESIGNAL_APP_ID ? 'ONESIGNAL_APP_ID sunucuda tanımlı değil' : 'ONESIGNAL_REST_API_KEY sunucuda tanımlı değil',
    }
  }
  try {
    const response = await fetch(`${ONESIGNAL_API_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        target_channel: 'push',
        include_aliases: { external_id: [userId] },
        headings: { en: 'Test bildirimi', tr: 'Test bildirimi' },
        contents: { en: 'Bildirimler çalışıyor 🎉', tr: 'Bildirimler çalışıyor 🎉' },
        data: { type: 'test', targetPath: '/notifications', targetId: '', title: 'Test bildirimi', body: 'Bildirimler çalışıyor' },
      }),
    })
    const json: any = await response.json().catch(() => ({}))
    const noSubscriber =
      !!json?.errors && (JSON.stringify(json.errors).includes('invalid_aliases') || JSON.stringify(json.errors).includes('not subscribed'))
    return {
      ok: response.ok && !!json?.id && !noSubscriber,
      reason: !response.ok
        ? `OneSignal HTTP ${response.status}`
        : noSubscriber
          ? 'Bu kullanıcı kimliğine (external_id) abone cihaz yok — uygulama OneSignal.login yapmamış veya izin verilmemiş'
          : undefined,
      status: response.status,
      response: json,
      appIdSuffix: ONESIGNAL_APP_ID.slice(-6),
    }
  } catch (e: any) {
    return { ok: false, reason: `İstek hatası: ${e?.message || e}` }
  }
}
