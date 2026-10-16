import prisma from '@/lib/db'
import { deleteFile } from '@/lib/s3'

/** Hediyenin depoda dosya tutan alanları (video/animasyon, kapak, ikon, ses, müzik). */
export const GIFT_MEDIA_PATH_FIELDS = [
  'cloudStoragePath',
  'thumbnailCloudPath',
  'iconImageCloudPath',
  'soundCloudPath',
  'musicCloudPath',
] as const

export type GiftMediaPathField = (typeof GIFT_MEDIA_PATH_FIELDS)[number]

/** Kayıttaki dolu depo anahtarları. */
export function giftMediaKeys(gift: Partial<Record<GiftMediaPathField, string | null>>): string[] {
  const keys = GIFT_MEDIA_PATH_FIELDS.map((f) => gift[f]).filter(
    (k): k is string => typeof k === 'string' && k.trim().length > 0,
  )
  return Array.from(new Set(keys.map((k) => k.trim())))
}

/**
 * Depodan dosyaları siler — başka bir hediye aynı dosyayı kullanıyorsa o
 * dosyaya dokunmaz. Hatalar işlemi durdurmaz (yalnız kayda geçer).
 */
export async function deleteGiftMediaKeys(keys: string[], exceptGiftId: string): Promise<number> {
  let deleted = 0
  for (const key of Array.from(new Set(keys.filter(Boolean)))) {
    try {
      const shared = await prisma.giftType.findFirst({
        where: {
          id: { not: exceptGiftId },
          OR: GIFT_MEDIA_PATH_FIELDS.map((f) => ({ [f]: key })),
        },
        select: { id: true },
      })
      if (shared) continue
      await deleteFile(key)
      deleted++
    } catch (e) {
      console.error('[gift-media-cleanup] dosya silinemedi:', key, e)
    }
  }
  return deleted
}
