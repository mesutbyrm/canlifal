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
  return out as T
}
