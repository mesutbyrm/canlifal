import prisma from '@/lib/db'

// Sitenin resmi sosyal hesapları. Veri, mevcut SiteSetting tablosunda tek bir JSON anahtarıyla tutulur
// (şema değişikliği ve migrasyon gerektirmez).
export const SOCIAL_SETTING_KEY = 'social_accounts'

export const SOCIAL_PLATFORMS: Record<string, { label: string; base: string }> = {
  instagram: { label: 'Instagram', base: 'https://www.instagram.com/' },
  tiktok: { label: 'TikTok', base: 'https://www.tiktok.com/@' },
  youtube: { label: 'YouTube', base: 'https://www.youtube.com/@' },
  x: { label: 'X (Twitter)', base: 'https://x.com/' },
  facebook: { label: 'Facebook', base: 'https://www.facebook.com/' },
}

export type SiteSocialAccount = { platform: string; value: string; enabled: boolean; url: string; label: string }

// Değer tam bir URL ise olduğu gibi, değilse platform tabanına eklenir (başındaki @ temizlenir).
export function buildSocialUrl(platform: string, value: string): string {
  const v = value.trim()
  if (/^https?:\/\//i.test(v)) return v
  const base = SOCIAL_PLATFORMS[platform]?.base ?? ''
  return base + v.replace(/^@+/, '')
}

export async function readSocialAccounts(): Promise<SiteSocialAccount[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: SOCIAL_SETTING_KEY } })
  let raw: any[] = []
  try {
    const parsed = row ? JSON.parse(row.value) : []
    if (Array.isArray(parsed)) raw = parsed
  } catch {
    raw = []
  }
  // Tüm platformları sabit sırada döndür; kaydı olmayanlar boş ve kapalı gelir.
  return Object.keys(SOCIAL_PLATFORMS).map((platform) => {
    const found = raw.find((a) => a?.platform === platform)
    const value = typeof found?.value === 'string' ? found.value : ''
    return {
      platform,
      value,
      enabled: found?.enabled !== false,
      url: value ? buildSocialUrl(platform, value) : '',
      label: SOCIAL_PLATFORMS[platform].label,
    }
  })
}

export async function writeSocialAccounts(
  accounts: { platform: string; value: string; enabled: boolean }[]
): Promise<SiteSocialAccount[]> {
  const cleaned = accounts
    .filter((a) => SOCIAL_PLATFORMS[a.platform])
    .map((a) => ({
      platform: a.platform,
      value: String(a.value ?? '').trim().slice(0, 300),
      enabled: a.enabled !== false,
    }))
    .filter((a) => a.value.length > 0) // boş değer = hesabı kaldır
  await prisma.siteSetting.upsert({
    where: { key: SOCIAL_SETTING_KEY },
    update: { value: JSON.stringify(cleaned) },
    create: { key: SOCIAL_SETTING_KEY, value: JSON.stringify(cleaned) },
  })
  return readSocialAccounts()
}
