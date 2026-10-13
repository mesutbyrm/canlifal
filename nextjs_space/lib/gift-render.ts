/**
 * Builds the render-metadata payload that every client (web + Flutter) needs to
 * display a gift identically: fullscreen edge-fill vs. anchored animation,
 * where on screen it appears, how long it stays, which asset to play, etc.
 *
 * This keeps all display rules server-driven so a gift looks the same on every
 * device and is visible to everyone in the room / stream.
 */

import { resolveMediaUrl, deriveAssetFormat, deriveMediaType, deriveMimeType } from './media-url'

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
  // ── Unified client-facing media descriptors (same as the gift catalog JSON) ──
  type: string                    // alias of mediaType
  mediaType: string               // video | image | gif | lottie | svga
  fileUrl: string | null          // primary asset (full public URL)
  previewUrl: string | null       // best static preview for grids/cells
  width: number | null
  height: number | null
  duration: number | null         // ms
  mimeType: string | null
}

/**
 * Accepts a full Prisma GiftType record (or any object carrying the same
 * fields) and returns only the fields clients need to render it.
 */
export function buildGiftRenderMeta(giftType: any): GiftRenderMeta {
  const assetUrl = resolveMediaUrl(giftType?.assetUrl) ?? null
  const assetType = giftType?.assetType ?? null
  const assetFormat = deriveAssetFormat(assetType, assetUrl, giftType?.animationType)
  const isVideo = assetFormat === 'mp4' || assetFormat === 'webm'
  const mediaType = deriveMediaType(assetFormat)
  const thumbnailUrl = resolveMediaUrl(giftType?.thumbnailUrl) ?? null
  const iconImageUrl = resolveMediaUrl(giftType?.iconImageUrl) ?? null
  // Best static image for png/webp/avif renderers.
  const imageUrl = (!isVideo && (assetFormat === 'png' || assetFormat === 'webp' || assetFormat === 'avif' || assetFormat === 'jpeg') ? assetUrl : null)
    ?? thumbnailUrl ?? iconImageUrl ?? null
  const isStaticImage = mediaType === 'image' || mediaType === 'gif'
  const previewUrl = thumbnailUrl ?? iconImageUrl ?? (isStaticImage ? assetUrl : null)
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
    // Unified client-facing descriptors (kept in sync with the gift catalog).
    type: mediaType,
    mediaType,
    fileUrl: assetUrl,
    previewUrl,
    width: giftType?.assetWidth ?? null,
    height: giftType?.assetHeight ?? null,
    duration: giftType?.assetDurationMs ?? null,
    mimeType: giftType?.assetMimeType ?? deriveMimeType(assetFormat),
  }
}
