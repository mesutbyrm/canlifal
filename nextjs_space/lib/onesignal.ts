// OneSignal Server-Side Helper - Send push notifications via REST API

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || ''
const ONESIGNAL_API_URL = 'https://api.onesignal.com'

interface OneSignalNotificationPayload {
  userId: string
  title: string
  message: string
  url?: string
  data?: Record<string, any>
}

/**
 * Send a push notification to a specific user via OneSignal REST API.
 * Uses external_id (which maps to our DB user id) to target the user.
 */
export async function sendOneSignalPush(payload: OneSignalNotificationPayload): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.warn('OneSignal credentials not configured, skipping push notification')
    return false
  }

  try {
    const response = await fetch(`${ONESIGNAL_API_URL}/api/v1/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: {
          external_id: [payload.userId],
        },
        target_channel: 'push',
        headings: { tr: payload.title, en: payload.title },
        contents: { tr: payload.message, en: payload.message },
        url: payload.url || undefined,
        data: payload.data || {},
        chrome_web_icon: '/logo.png',
        firefox_icon: '/logo.png',
      }),
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
 */
export async function sendOneSignalPushToMany(
  userIds: string[],
  title: string,
  message: string,
  url?: string,
  data?: Record<string, any>
): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY || userIds.length === 0) {
    return false
  }

  try {
    const response = await fetch(`${ONESIGNAL_API_URL}/api/v1/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: {
          external_id: userIds,
        },
        target_channel: 'push',
        headings: { tr: title, en: title },
        contents: { tr: message, en: message },
        url: url || undefined,
        data: data || {},
        chrome_web_icon: '/logo.png',
        firefox_icon: '/logo.png',
      }),
    })

    return response.ok
  } catch (error) {
    console.error('OneSignal push to many error:', error)
    return false
  }
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
    'gift': '🎁 Yeni Hediye',
    'follow': '👤 Yeni Takipçi',
    'unfollow': '👤 Takipten Çıkıldı',
    'profile_view': '👁️ Profil Görüntüleme',
    'message': '✉️ Yeni Mesaj',
    'stream_start': '🔴 Canlı Yayın',
    'co_broadcast_invite': '📹 Ortak Yayın Daveti',
    'achievement': '🏆 Yeni Başarım',
    'contest_result': '🎉 Yarışma Sonucu',
    'new_blog': '📝 Yeni Blog Yazısı',
    'moderation': '⚠️ Moderasyon Bildirimi',
  }
  return titles[type] || '🔔 Yeni Bildirim'
}

/**
 * Get notification URL based on notification type.
 */
export function getNotificationUrl(type: string, data?: Record<string, any>): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'
  
  if (type === 'payment_notification' || type === 'payment_approved' || type === 'payment_rejected') {
    return `${baseUrl}/uyelik`
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
  if (type === 'stream_start') {
    return `${baseUrl}/sohbet/video`
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
