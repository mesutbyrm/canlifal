// OneSignal Admin API helpers for notification management panel
//
// `sendNotification` artık `PUSH_PROVIDER`'a göre yönlenir (lib/push → pushProvider)
// (lib/fcm). OneSignal yalnız PUSH_PROVIDER=onesignal ile (acil geri dönüş).
import { pushProvider } from '@/lib/push'
import { sendFcmToAllDevices, sendFcmToUsers } from '@/lib/fcm'

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || ''
const API_URL = 'https://api.onesignal.com'

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Key ${REST_API_KEY}`,
  }
}

export interface SendNotificationParams {
  title: string
  message: string
  url?: string
  imageUrl?: string
  targetType: 'all' | 'segment' | 'tag' | 'player_id'
  targetValue?: string
  scheduledAt?: string // ISO date string
  /** Bildirim türü (Android kanalı için). Varsayılan: admin_announcement */
  type?: string
}

export interface OneSignalSendResult {
  success: boolean
  onesignalId?: string
  recipientCount?: number
  error?: string
}

/**
 * Send a notification via OneSignal REST API with various targeting options.
 */
function toAppPath(url?: string): string {
  if (!url) return ''
  try {
    if (url.startsWith('http')) {
      const u = new URL(url)
      return `${u.pathname}${u.search}`
    }
  } catch {}
  return url.startsWith('/') ? url : `/${url}`
}

/** FCM ile toplu/hedefli gönderim (OneSignal segment/etiket kavramı yok). */
async function sendNotificationFcm(params: SendNotificationParams): Promise<OneSignalSendResult> {
  if (params.scheduledAt) {
    return { success: false, error: 'Zamanlanmış gönderim FCM ile desteklenmiyor — şimdi gönderin' }
  }
  const payload = {
    title: params.title,
    body: params.message,
    type: params.type || 'admin_announcement',
    targetPath: toAppPath(params.url),
    data: params.imageUrl ? { imageUrl: params.imageUrl } : undefined,
  }
  let summary
  if (params.targetType === 'all' || (params.targetType === 'segment' && (!params.targetValue || params.targetValue === 'All'))) {
    summary = await sendFcmToAllDevices(payload)
  } else if (params.targetType === 'player_id' && params.targetValue) {
    summary = await sendFcmToUsers(params.targetValue.split(',').map(id => id.trim()).filter(Boolean), payload)
  } else {
    return { success: false, error: 'FCM ile segment/etiket hedefleme yok — "Tümü" veya kullanıcı kimliği seçin' }
  }
  if (!summary.configured) return { success: false, error: 'FCM sunucuda yapılandırılmamış' }
  return {
    success: summary.sent > 0,
    recipientCount: summary.sent,
    error: summary.sent > 0 ? undefined : `Gönderilemedi (${summary.devices} cihaz): ${JSON.stringify(summary.errors)}`,
  }
}

export async function sendNotification(params: SendNotificationParams): Promise<OneSignalSendResult> {
  const provider = pushProvider()
  if (provider === 'off') return { success: false, error: 'Push sunucuda kapalı (PUSH_PROVIDER=off)' }
  if (provider === 'fcm') return sendNotificationFcm(params)
  if (!APP_ID || !REST_API_KEY) {
    return { success: false, error: 'OneSignal yapılandırması eksik' }
  }

  try {
    const body: Record<string, any> = {
      app_id: APP_ID,
      headings: { tr: params.title, en: params.title },
      contents: { tr: params.message, en: params.message },
      chrome_web_icon: '/logo.png',
      firefox_icon: '/logo.png',
    }

    // Convert relative URLs to absolute
    if (params.url) {
      const baseUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'
      body.url = params.url.startsWith('http') ? params.url : `${baseUrl}${params.url.startsWith('/') ? '' : '/'}${params.url}`
    }
    if (params.imageUrl) {
      body.big_picture = params.imageUrl
      body.chrome_web_image = params.imageUrl
    }

    // Targeting
    switch (params.targetType) {
      case 'all':
        body.included_segments = ['All']
        break
      case 'segment':
        body.included_segments = [params.targetValue || 'All']
        break
      case 'tag':
        if (params.targetValue) {
          // Parse tag filter: "key=value" format
          const parts = params.targetValue.split('=')
          if (parts.length === 2) {
            body.filters = [
              { field: 'tag', key: parts[0].trim(), relation: '=', value: parts[1].trim() }
            ]
          } else {
            body.filters = [
              { field: 'tag', key: params.targetValue.trim(), relation: 'exists' }
            ]
          }
        }
        break
      case 'player_id':
        if (params.targetValue) {
          body.include_aliases = {
            external_id: params.targetValue.split(',').map(id => id.trim()),
          }
          body.target_channel = 'push'
        }
        break
    }

    // Scheduling
    if (params.scheduledAt) {
      body.send_after = params.scheduledAt
    }

    const response = await fetch(`${API_URL}/notifications`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.errors?.join(', ') || `OneSignal API hatası: ${response.status}`,
      }
    }

    return {
      success: true,
      onesignalId: result.id,
      recipientCount: result.recipients || 0,
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Bağlantı hatası' }
  }
}

/**
 * Get app-level statistics from OneSignal.
 */
export async function getAppStats(): Promise<{
  subscribers: number
  error?: string
}> {
  if (!APP_ID || !REST_API_KEY) {
    return { subscribers: 0, error: 'OneSignal yapılandırması eksik' }
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/apps/${APP_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${REST_API_KEY}`,
      },
    })

    if (!response.ok) {
      return { subscribers: 0, error: `API hatası: ${response.status}` }
    }

    const data = await response.json()
    return {
      subscribers: data.players || 0,
    }
  } catch (error: any) {
    return { subscribers: 0, error: error.message }
  }
}

/**
 * Get details of a specific notification from OneSignal.
 */
export async function getNotificationDetails(notificationId: string): Promise<{
  delivered?: number
  clicked?: number
  error?: string
}> {
  if (!APP_ID || !REST_API_KEY || !notificationId) {
    return { error: 'Eksik parametre' }
  }

  try {
    const response = await fetch(
      `${API_URL}/api/v1/notifications/${notificationId}?app_id=${APP_ID}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Key ${REST_API_KEY}`,
        },
      }
    )

    if (!response.ok) {
      return { error: `API hatası: ${response.status}` }
    }

    const data = await response.json()
    return {
      delivered: data.successful || 0,
      clicked: data.converted || 0,
    }
  } catch (error: any) {
    return { error: error.message }
  }
}

/**
 * Cancel a scheduled notification.
 */
export async function cancelNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  if (!APP_ID || !REST_API_KEY || !notificationId) {
    return { success: false, error: 'Eksik parametre' }
  }

  try {
    const response = await fetch(
      `${API_URL}/api/v1/notifications/${notificationId}?app_id=${APP_ID}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Key ${REST_API_KEY}`,
        },
      }
    )

    return { success: response.ok }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
