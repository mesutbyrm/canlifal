export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCachedPlatformSetting } from '@/lib/cache'

/**
 * GET /api/mobile/config
 * Query: ?platform=ios|android&version=1.0.0
 *
 * Returns mobile app configuration including:
 * - Force update check
 * - Maintenance mode
 * - Feature flags
 * - App store URLs
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const platform = searchParams.get('platform') || 'unknown' // ios | android
    const currentVersion = searchParams.get('version') || '0.0.0'

    // Fetch all config from platform settings
    const [
      maintenanceMode,
      maintenanceMessage,
      minVersionIos,
      minVersionAndroid,
      latestVersionIos,
      latestVersionAndroid,
      appStoreUrl,
      playStoreUrl,
      forceUpdateMessage,
      optionalUpdateMessage,
      // Feature flags
      liveStreamEnabled,
      chatEnabled,
      shortVideosEnabled,
      gamesEnabled,
      storiesEnabled,
      aiFortuneEnabled,
      liveTellerEnabled,
      pkBattleEnabled,
      // Misc
      adNetworkConfig,
      termsUrl,
      privacyUrl,
      supportEmail,
    ] = await Promise.all([
      getCachedPlatformSetting('maintenance_mode', 'false'),
      getCachedPlatformSetting('maintenance_message', 'Bakım çalışması yapılmaktadır. Lütfen daha sonra tekrar deneyin.'),
      getCachedPlatformSetting('min_version_ios', '1.0.0'),
      getCachedPlatformSetting('min_version_android', '1.0.0'),
      getCachedPlatformSetting('latest_version_ios', '1.0.0'),
      getCachedPlatformSetting('latest_version_android', '1.0.0'),
      getCachedPlatformSetting('app_store_url', ''),
      getCachedPlatformSetting('play_store_url', ''),
      getCachedPlatformSetting('force_update_message', 'Uygulamanın yeni bir sürümü mevcut. Devam etmek için güncellemeniz gerekiyor.'),
      getCachedPlatformSetting('optional_update_message', 'Uygulamanın yeni bir sürümü mevcut. Güncellemek ister misiniz?'),
      getCachedPlatformSetting('feature_live_stream', 'true'),
      getCachedPlatformSetting('feature_chat', 'true'),
      getCachedPlatformSetting('feature_short_videos', 'true'),
      getCachedPlatformSetting('feature_games', 'true'),
      getCachedPlatformSetting('feature_stories', 'true'),
      getCachedPlatformSetting('feature_ai_fortune', 'true'),
      getCachedPlatformSetting('feature_live_teller', 'true'),
      getCachedPlatformSetting('feature_pk_battle', 'true'),
      getCachedPlatformSetting('ad_network_config', '{}'),
      getCachedPlatformSetting('terms_url', 'https://canlifal.com/tr/yasal/kullanim-sartlari'),
      getCachedPlatformSetting('privacy_url', 'https://canlifal.com/tr/yasal/gizlilik-politikasi'),
      getCachedPlatformSetting('support_email', 'destek@canlifal.com'),
    ])

    const isIos = platform === 'ios'
    const minVersion = isIos ? minVersionIos : minVersionAndroid
    const latestVersion = isIos ? latestVersionIos : latestVersionAndroid
    const storeUrl = isIos ? appStoreUrl : playStoreUrl

    // Version comparison
    const needsForceUpdate = compareVersions(currentVersion, minVersion) < 0
    const hasOptionalUpdate = !needsForceUpdate && compareVersions(currentVersion, latestVersion) < 0

    // Parse ad config safely
    let adConfig = {}
    try { adConfig = JSON.parse(adNetworkConfig) } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      data: {
        // Maintenance
        maintenance: {
          enabled: maintenanceMode === 'true',
          message: maintenanceMessage,
        },
        // Version
        version: {
          current: currentVersion,
          minimum: minVersion,
          latest: latestVersion,
          forceUpdate: needsForceUpdate,
          optionalUpdate: hasOptionalUpdate,
          forceUpdateMessage,
          optionalUpdateMessage,
          storeUrl,
        },
        // Feature flags
        features: {
          liveStream: liveStreamEnabled === 'true',
          chat: chatEnabled === 'true',
          shortVideos: shortVideosEnabled === 'true',
          games: gamesEnabled === 'true',
          stories: storiesEnabled === 'true',
          aiFortune: aiFortuneEnabled === 'true',
          liveTeller: liveTellerEnabled === 'true',
          pkBattle: pkBattleEnabled === 'true',
        },
        // Ads
        ads: adConfig,
        // Links
        links: {
          terms: termsUrl,
          privacy: privacyUrl,
          support: supportEmail,
          appStore: appStoreUrl,
          playStore: playStoreUrl,
        },
      },
    })
  } catch (error) {
    console.error('Mobile config error:', error)
    return NextResponse.json({ error: 'Konfigürasyon yüklenemedi' }, { status: 500 })
  }
}

/**
 * Compare two semver strings
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}
