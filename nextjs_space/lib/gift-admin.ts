/**
 * Sade hediye kataloğu — admin kayıt kuralları + katalog senkronu.
 *
 * Admin yalnızca şunları seçer: isim, emoji, açıklama, aktif/pasif, dosya,
 * küçük önizleme, panel ikonu, ses efekti, müzik, jeton fiyatı ve görüntüleme
 * türü (tam ekran / yarım ekran / küçük-orta). Geri kalan her şey (animasyon
 * türü, süre, öncelik, parçacık, konum, sıralama, görünürlük) yüklenen medyaya
 * göre burada otomatik hesaplanır; böylece her sürüm APK aynı değerleri alır.
 */

import prisma from '@/lib/db'
import { invalidateCache, invalidateCachePrefix } from '@/lib/cache'
import { deriveAssetFormat, deriveMediaType, deriveMimeType, resolveMediaUrl } from '@/lib/media-url'

/** Silinen hediyeler bu kategoriyle işaretlenir (geçmiş gönderimler FK ile bağlı). */
export const DELETED_GIFT_CATEGORY = '__deleted__'

/** Prisma where parçası: silinmiş hediyeleri hariç tut (NULL kategori dahil). */
export const notDeletedGiftWhere = {
  OR: [{ category: null }, { category: { not: DELETED_GIFT_CATEGORY } }],
}

export type GiftDisplayMode = 'full' | 'half' | 'small'

export function parseDisplayMode(raw: unknown): GiftDisplayMode | null {
  const v = String(raw ?? '').trim().toLowerCase()
  if (['full', 'full_screen', 'fullscreen', 'tam'].includes(v)) return 'full'
  if (['half', 'half_screen', 'yarim', 'yarım'].includes(v)) return 'half'
  if (['small', 'center', 'mini', 'kucuk', 'küçük'].includes(v)) return 'small'
  return null
}

/** Kayıtlı bir hediyenin görüntüleme türü (eski kayıtlar için türetilir). */
export function displayModeOf(g: any): GiftDisplayMode {
  const area = String(g?.displayArea ?? '').toUpperCase()
  if (area === 'FULL_SCREEN' || g?.isFullscreen) return 'full'
  if (area === 'HALF_SCREEN') return 'half'
  if (area === 'CENTER' || area === 'SEAT' || area === 'TOP' || area === 'BOTTOM') return 'small'
  const tier = String(g?.tier ?? '').toLowerCase()
  if (tier === 'huge') return 'full'
  // Eski kayıtlar: konum seçilmemiş videolar istemcide zaten tam ekran oynuyordu.
  if (!area) {
    const fmt = deriveAssetFormat(g?.assetType, resolveMediaUrl(g?.assetUrl) ?? g?.assetUrl, null)
    if (deriveMediaType(fmt) === 'video') return 'full'
  }
  if (tier === 'big') return 'half'
  return 'small'
}

/**
 * Birleşik hediye kaydından (mevcut + gelen değişiklikler) otomatik motor
 * alanlarını hesaplar. Dönen nesne doğrudan Prisma `data` içine yazılır.
 */
export function deriveGiftEngineFields(merged: any, explicitMode?: GiftDisplayMode | null) {
  const mode = explicitMode ?? displayModeOf(merged)
  const assetUrl = resolveMediaUrl(merged?.assetUrl) ?? merged?.assetUrl ?? null
  const format = deriveAssetFormat(merged?.assetType, assetUrl, null)
  const mediaType = deriveMediaType(format)
  const price = Math.max(1, parseInt(String(merged?.price ?? 1)) || 1)

  const assetType =
    mediaType === 'video' ? 'video'
      : format === 'lottie' ? 'lottie'
        : format === 'svga' ? 'svga'
          : format === 'gif' ? 'gif'
            : 'image'

  const animationType =
    format === 'mp4' ? 'MP4'
      : format === 'webm' ? 'WEBM'
        : format === 'lottie' || format === 'svga' ? 'LOTTIE'
          : format === 'svg' ? 'SVG'
            : 'PNG'

  // Süre = medyanın kendi uzunluğu; süresiz görsellerde sabit kısa gösterim.
  const mediaMs = typeof merged?.assetDurationMs === 'number' && merged.assetDurationMs > 0
    ? merged.assetDurationMs
    : null
  const durationMs = mediaMs ?? (mediaType === 'image' ? 3000 : null)

  const isSmall = mode === 'small'
  const particle = isSmall
    ? (merged?.particleEffect && merged.particleEffect !== 'none' ? merged.particleEffect : 'confetti')
    : 'none'

  const byMode = {
    full: { displayArea: 'FULL_SCREEN', priority: 'ULTRA', tier: 'huge', screenPosition: 'fullscreen' },
    half: { displayArea: 'HALF_SCREEN', priority: 'LARGE', tier: 'big', screenPosition: 'center' },
    small: { displayArea: 'CENTER', priority: 'MEDIUM', tier: 'small', screenPosition: 'center' },
  }[mode]

  return {
    ...byMode,
    isFullscreen: mode === 'full',
    visibleAsFullscreen: mode === 'full',
    visibleAsMini: isSmall,
    displayType: mode === 'full' ? 'fullscreen'
      : mediaType === 'video' ? 'video'
        : mediaType === 'image' ? 'static'
          : 'animation',
    assetType,
    animationType,
    assetMimeType: merged?.assetMimeType || deriveMimeType(format) || null,
    animationDurationMs: durationMs,
    displayDurationMs: durationMs,
    startDelayMs: 0,
    repeatCount: 1,
    particleEffect: particle,
    seatEffect: isSmall ? 'GLOW' : 'NONE',
    seatEffectEnabled: isSmall,
    soundEffectEnabled: true,
    // Sesli oda, canlı yayın ve PK — her hediye her yerde gönderilebilir.
    visibleInVoiceRoom: true,
    visibleInLiveStream: true,
    visibleInPK: true,
    pkOnly: false,
    liveOnly: false,
    voiceOnly: false,
    // Sıralama her zaman jeton fiyatına göre (1 → 100K).
    price,
    sortOrder: price,
  }
}

/**
 * Global, tekdüze artan katalog sürümü. Her ekleme/güncelleme/silme bir önceki
 * en yüksek sürümün üstüne yazılır; böylece her APK sürümü delta ile değişen
 * hediyeyi (isim/fiyat/pasif/silindi) kaçırmadan alır.
 */
export async function nextGiftContentVersion(): Promise<number> {
  const agg = await prisma.giftType.aggregate({ _max: { contentVersion: true } })
  return (agg._max.contentVersion ?? 0) + 1
}

export function invalidateGiftCaches() {
  invalidateCache('gifts:active')
  invalidateCache('gifts:version-check')
  invalidateCachePrefix('gifts:catalog:')
  invalidateCache('live:gift_types')
}

/**
 * Katalog çıktısı: eski APK'lar `sortOrder` sonra `price` ile sıralar ve
 * bağlam görünürlüğüne bakar — burada fiyat sırası ve tüm bağlamlar zorlanır.
 */
export function normalizeCatalogGift<T extends Record<string, any>>(g: T): T {
  const deleted = g?.category === DELETED_GIFT_CATEGORY
  return {
    ...g,
    sortOrder: g.price,
    isActive: deleted ? false : g.isActive,
    isHidden: deleted ? true : g.isHidden,
    displayMode: displayModeOf(g),
    visibleInVoiceRoom: true,
    visibleInLiveStream: true,
    visibleInPK: true,
  }
}
