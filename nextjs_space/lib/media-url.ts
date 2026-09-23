import { buildPublicUrl, isR2Key } from './r2-storage'
import { getBucketConfig } from './aws-config'

/**
 * Resolve a stored media reference to a fully-qualified public URL.
 *
 * Handles every shape that can be persisted in the database:
 *  - empty / null                    -> null
 *  - already a full http(s) URL      -> returned unchanged
 *  - a new Cloudflare R2 key         -> resolved via the R2 CDN public URL
 *    (e.g. "gift/gifts/uuid.mp4" -> "https://cdn.girlive.com/gift/gifts/uuid.mp4")
 *  - a legacy relative AWS S3 key    -> resolved via the S3 public URL
 *
 * This is synchronous because every media asset it resolves is public, so no
 * presigning is required. Use it whenever a gift/asset record is serialized to
 * a client (web or mobile) so both platforms always receive a working URL.
 */
export function resolveMediaUrl(value?: string | null): string | null {
  if (!value) return null
  const v = String(value).trim()
  if (!v) return null

  // Already absolute.
  if (/^https?:\/\//i.test(v)) return v
  // Protocol-relative or data URIs -> leave untouched.
  if (v.startsWith('//') || v.startsWith('data:')) return v

  // New uploads live in Cloudflare R2 (gift/ or shorts/ prefixes).
  if (isR2Key(v)) return buildPublicUrl(v)

  // Legacy AWS S3 relative key.
  try {
    const { bucketName } = getBucketConfig()
    const region = process.env.AWS_REGION || 'us-east-1'
    const encodedKey = v.split('/').map(encodeURIComponent).join('/')
    return `https://${bucketName}.s3.${region}.amazonaws.com/${encodedKey}`
  } catch {
    return v
  }
}

/**
 * Media-bearing fields on a GiftType record. Each is resolved to a full public
 * URL so both web and mobile clients can render the gift directly.
 */
const GIFT_MEDIA_FIELDS = [
  'assetUrl',
  'thumbnailUrl',
  'iconImageUrl',
  'soundUrl',
  'musicUrl',
  'animation',
] as const

/**
 * Return a shallow copy of a gift record with all media fields resolved to full
 * public URLs. Non-gift shapes are handled gracefully (missing fields ignored).
 */
export function serializeGiftMedia<T extends Record<string, any>>(gift: T): T {
  if (!gift || typeof gift !== 'object') return gift
  const out: Record<string, any> = { ...gift }
  for (const field of GIFT_MEDIA_FIELDS) {
    if (out[field] != null && out[field] !== '') {
      const resolved = resolveMediaUrl(out[field])
      if (resolved != null) out[field] = resolved
    }
  }
  // Add the unified, client-facing media descriptors (type/mediaType/fileUrl/
  // previewUrl/width/height/duration/mimeType). These are ADDITIVE and never
  // remove or rename existing fields, so both web and Flutter stay compatible.
  const media = computeGiftMediaFields(gift)
  out.type = media.type
  out.mediaType = media.mediaType
  out.assetFormat = media.assetFormat
  out.fileUrl = media.fileUrl
  out.previewUrl = media.previewUrl
  out.width = media.width
  out.height = media.height
  out.duration = media.duration
  out.mimeType = media.mimeType
  return out as T
}

/**
 * ────────────────────────────────────────────────────────────────────────────
 * Unified gift media descriptors
 *
 * Both the web app and the Flutter app consume the SAME gift JSON, so we expose
 * a small, explicit set of fields every client can rely on to render a gift
 * regardless of its underlying format (png/svg/gif/webp/mp4/webm/lottie/svga):
 *   type, mediaType, fileUrl, thumbnailUrl, previewUrl, width, height,
 *   duration, mimeType
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * Derives a concrete asset format (png/jpeg/webp/avif/gif/svg/svga/lottie/mp4/webm)
 * from the stored assetType/animationType and the file extension of the url.
 */
export function deriveAssetFormat(
  assetType: string | null | undefined,
  url: string | null | undefined,
  animationType?: string | null | undefined,
): string | null {
  const t = (assetType || '').toLowerCase()
  const a = (animationType || '').toLowerCase()
  const u = (url || '').toLowerCase().split('?')[0]
  const ext = u.includes('.') ? u.substring(u.lastIndexOf('.') + 1) : ''
  if (ext === 'svga') return 'svga'
  if (ext === 'json' || ext === 'lottie' || t === 'lottie' || a === 'lottie') return 'lottie'
  if (ext === 'mp4' || a === 'mp4') return 'mp4'
  if (ext === 'webm' || a === 'webm') return 'webm'
  if (ext === 'gif' || t === 'gif') return 'gif'
  if (ext === 'webp') return 'webp'
  if (ext === 'avif') return 'avif'
  if (ext === 'svg' || a === 'svg') return 'svg'
  if (ext === 'png' || a === 'png') return 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg'
  if (t === 'svga') return 'svga'
  if (t === 'video') return 'mp4'
  if (t === 'image') return 'png'
  return t || null
}

/** High-level media category used by clients to pick a renderer. */
export function deriveMediaType(format: string | null | undefined): string {
  switch ((format || '').toLowerCase()) {
    case 'mp4':
    case 'webm':
      return 'video'
    case 'gif':
      return 'gif'
    case 'lottie':
      return 'lottie'
    case 'svga':
      return 'svga'
    case 'png':
    case 'jpeg':
    case 'webp':
    case 'avif':
    case 'svg':
      return 'image'
    default:
      return 'image'
  }
}

/** MIME type for a derived format. */
export function deriveMimeType(format: string | null | undefined): string | null {
  switch ((format || '').toLowerCase()) {
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'gif':
      return 'image/gif'
    case 'png':
      return 'image/png'
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'avif':
      return 'image/avif'
    case 'svg':
      return 'image/svg+xml'
    case 'lottie':
      return 'application/json'
    case 'svga':
      return 'application/octet-stream'
    default:
      return null
  }
}

export interface GiftMediaFields {
  type: string           // alias of mediaType (kept for clients expecting `type`)
  mediaType: string      // video | image | gif | lottie | svga
  assetFormat: string | null
  fileUrl: string | null // the primary asset (full public URL)
  thumbnailUrl: string | null
  previewUrl: string | null // best static preview (thumbnail -> icon image -> static asset)
  width: number | null
  height: number | null
  duration: number | null   // ms
  mimeType: string | null
}

/**
 * Compute the unified, client-facing media descriptors for a gift record.
 * All URLs are resolved to fully-qualified public URLs.
 */
export function computeGiftMediaFields(gift: Record<string, any> | null | undefined): GiftMediaFields {
  const fileUrl = resolveMediaUrl(gift?.assetUrl) ?? null
  const thumbnailUrl = resolveMediaUrl(gift?.thumbnailUrl) ?? null
  const iconImageUrl = resolveMediaUrl(gift?.iconImageUrl) ?? null
  const format = deriveAssetFormat(gift?.assetType, fileUrl, gift?.animationType)
  const mediaType = deriveMediaType(format)
  const isVideo = mediaType === 'video'
  const isStaticImage = mediaType === 'image' || mediaType === 'gif'
  // previewUrl: something clients can safely show inside an <img>/grid cell.
  const previewUrl =
    thumbnailUrl ??
    iconImageUrl ??
    (isStaticImage ? fileUrl : null)
  return {
    type: mediaType,
    mediaType,
    assetFormat: format,
    fileUrl,
    thumbnailUrl,
    previewUrl,
    width: gift?.assetWidth ?? null,
    height: gift?.assetHeight ?? null,
    duration: gift?.assetDurationMs ?? null,
    mimeType: gift?.assetMimeType ?? deriveMimeType(format),
  }
}
