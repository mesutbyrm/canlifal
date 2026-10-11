import { getCachedPlatformSetting } from '@/lib/cache'

/**
 * Trend Videolar bölümü yönetim panelinden açılıp kapatılabilir.
 * Varsayılan: KAPALI (pasif).
 */
export async function isTrendVideosEnabled(): Promise<boolean> {
  try {
    const v = await getCachedPlatformSetting('trend_videos_enabled', 'false')
    return String(v).toLowerCase() === 'true'
  } catch {
    return false
  }
}
