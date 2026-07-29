/**
 * Builds the render-metadata payload that every client (web + Flutter) needs to
 * display a gift identically: fullscreen edge-fill vs. anchored animation,
 * where on screen it appears, how long it stays, which asset to play, etc.
 *
 * This keeps all display rules server-driven so a gift looks the same on every
 * device and is visible to everyone in the room / stream.
 */

import { resolveMediaUrl } from './media-url'

export interface GiftRenderMeta {
  giftIcon: string
  assetUrl: string | null
  assetType: string | null        // image | video | lottie | svga | gif
  // Normalised asset format the client uses to pick a renderer:
  //   png/webp/avif -> CachedNetworkImage, gif -> Image.network,
  //   svga -> svga_player, lottie -> lottie, mp4/webm -> video_player
  assetFormat: string | null      // png | webp | avif | gif | svga | lottie | mp4 | webm | image
  imageUrl: string | null         // best static image url (thumbnail/iconImage) for png/webp/avif
  videoUrl: string | null         // set only when the asset is a video (mp4/webm)
  thumbnailUrl: string | null
  displayType: string | null      // static | animation | video | fullscreen | mini | continuous | ...
  animationType: string | null    // legacy `animation` field, kept for clients
  isFullscreen: boolean           // true => fill screen edge-to-edge
  visibleAsFullscreen: boolean
  visibleInVoiceRoom: boolean
  visibleInLiveStream: boolean
  screenPosition: string | null   // bottom | top | center | above_seat | room_center | fullscreen | message_area | ...
  displayDurationMs: number | null
  animationDurationMs: number | null
  startDelayMs: number | null
  tier: string | null             // small | big | huge
  repeatCount: number | null
  particleEffect: string | null
  effectColor: string | null
  soundUrl: string | null
  musicUrl: string | null
}

/**
 * Derives a concrete asset format (png/webp/avif/gif/svga/lottie/mp4/webm)
 * from the stored assetType and the file extension of the url. Lets every
 * client pick the correct player without guessing.
 */
function deriveAssetFormat(assetType: string | null | undefined, url: string | null | undefined): string | null {
  const t = (assetType || '').toLowerCase()
  const u = (url || '').toLowerCase().split('?')[0]
  const ext = u.includes('.') ? u.substring(u.lastIndexOf('.') + 1) : ''
  if (ext === 'svga') return 'svga'
  if (ext === 'json' || ext === 'lottie' || t === 'lottie') return 'lottie'
  if (ext === 'mp4') return 'mp4'
  if (ext === 'webm') return 'webm'
  if (ext === 'gif' || t === 'gif') return 'gif'
  if (ext === 'webp') return 'webp'
  if (ext === 'avif') return 'avif'
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return ext === 'jpg' ? 'jpeg' : ext
  if (t === 'svga') return 'svga'
  if (t === 'video') return 'mp4'
  if (t === 'image') return 'png'
  return t || null
}

/**
 * Accepts a full Prisma GiftType record (or any object carrying the same
 * fields) and returns only the fields clients need to render it.
 */
export function buildGiftRenderMeta(giftType: any): GiftRenderMeta {
  const assetUrl = resolveMediaUrl(giftType?.assetUrl) ?? null
  const assetType = giftType?.assetType ?? null
  const assetFormat = deriveAssetFormat(assetType, assetUrl)
  const isVideo = assetFormat === 'mp4' || assetFormat === 'webm'
  const thumbnailUrl = resolveMediaUrl(giftType?.thumbnailUrl) ?? null
  const iconImageUrl = resolveMediaUrl(giftType?.iconImageUrl) ?? null
  // Best static image for png/webp/avif renderers.
  const imageUrl = (!isVideo && (assetFormat === 'png' || assetFormat === 'webp' || assetFormat === 'avif' || assetFormat === 'jpeg') ? assetUrl : null)
    ?? thumbnailUrl ?? iconImageUrl ?? null
  return {
    giftIcon: giftType?.icon ?? '',
    assetUrl,
    assetType,
    assetFormat,
    imageUrl,
    videoUrl: isVideo ? assetUrl : null,
    thumbnailUrl,
    displayType: giftType?.displayType ?? null,
    animationType: giftType?.animation ?? giftType?.displayType ?? null,
    isFullscreen: !!giftType?.isFullscreen,
    visibleAsFullscreen: giftType?.visibleAsFullscreen ?? false,
    visibleInVoiceRoom: giftType?.visibleInVoiceRoom ?? true,
    visibleInLiveStream: giftType?.visibleInLiveStream ?? true,
    screenPosition: giftType?.screenPosition ?? null,
    displayDurationMs: giftType?.displayDurationMs ?? giftType?.animationDurationMs ?? null,
    animationDurationMs: giftType?.animationDurationMs ?? null,
    startDelayMs: giftType?.startDelayMs ?? null,
    tier: giftType?.tier ?? null,
    repeatCount: giftType?.repeatCount ?? null,
    particleEffect: giftType?.particleEffect ?? null,
    effectColor: giftType?.effectColor ?? null,
    soundUrl: resolveMediaUrl(giftType?.soundUrl) ?? null,
    musicUrl: resolveMediaUrl(giftType?.musicUrl) ?? null,
  }
}
