/**
 * Builds the render-metadata payload that every client (web + Flutter) needs to
 * display a gift identically: fullscreen edge-fill vs. anchored animation,
 * where on screen it appears, how long it stays, which asset to play, etc.
 *
 * This keeps all display rules server-driven so a gift looks the same on every
 * device and is visible to everyone in the room / stream.
 */

export interface GiftRenderMeta {
  giftIcon: string
  assetUrl: string | null
  assetType: string | null        // image | video | lottie | svga | gif
  displayType: string | null      // static | animation | video | fullscreen | mini | continuous | ...
  isFullscreen: boolean           // true => fill screen edge-to-edge
  visibleAsFullscreen: boolean
  visibleInVoiceRoom: boolean
  visibleInLiveStream: boolean
  screenPosition: string | null   // bottom | top | center | above_seat | room_center | fullscreen | message_area | ...
  displayDurationMs: number | null
  tier: string | null             // small | big | huge
  repeatCount: number | null
  particleEffect: string | null
  soundUrl: string | null
}

/**
 * Accepts a full Prisma GiftType record (or any object carrying the same
 * fields) and returns only the fields clients need to render it.
 */
export function buildGiftRenderMeta(giftType: any): GiftRenderMeta {
  return {
    giftIcon: giftType?.icon ?? '',
    assetUrl: giftType?.assetUrl ?? null,
    assetType: giftType?.assetType ?? null,
    displayType: giftType?.displayType ?? null,
    isFullscreen: !!giftType?.isFullscreen,
    visibleAsFullscreen: giftType?.visibleAsFullscreen ?? false,
    visibleInVoiceRoom: giftType?.visibleInVoiceRoom ?? true,
    visibleInLiveStream: giftType?.visibleInLiveStream ?? true,
    screenPosition: giftType?.screenPosition ?? null,
    displayDurationMs: giftType?.displayDurationMs ?? null,
    tier: giftType?.tier ?? null,
    repeatCount: giftType?.repeatCount ?? null,
    particleEffect: giftType?.particleEffect ?? null,
    soundUrl: giftType?.soundUrl ?? null,
  }
}
