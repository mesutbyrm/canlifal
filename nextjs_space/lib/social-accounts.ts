import prisma from '@/lib/db'

/**
 * Sitenin resmi sosyal medya hesapları — admin panelinden düzenlenir,
 * `SiteSetting` (key = social_accounts) içinde JSON olarak saklanır.
 * Değer kullanıcı adı (`@canlifal`) veya tam bağlantı olabilir.
 */
export const SOCIAL_ACCOUNTS_KEY = 'social_accounts'

export const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', base: 'https://instagram.com/' },
  { id: 'tiktok', label: 'TikTok', base: 'https://www.tiktok.com/@' },
  { id: 'youtube', label: 'YouTube', base: 'https://www.youtube.com/@' },
  { id: 'x', label: 'X (Twitter)', base: 'https://x.com/' },
  { id: 'facebook', label: 'Facebook', base: 'https://facebook.com/' },
  { id: 'telegram', label: 'Telegram', base: 'https://t.me/' },
  { id: 'whatsapp', label: 'WhatsApp', base: 'https://wa.me/' },
  { id: 'website', label: 'Web sitesi', base: 'https://' },
] as const

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]['id']

export interface SocialAccount {
  platform: SocialPlatformId
  label: string
  value: string
  handle: string | null
  url: string
  enabled: boolean
}

const MAX_VALUE = 200

function cleanHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').replace(/\s+/g, '')
}

/** Kullanıcı adı veya bağlantıyı doğrular ve açılabilir URL üretir. */
export function buildSocialAccount(
  platform: string,
  rawValue: unknown,
  enabled: unknown = true
): SocialAccount | null {
  const p = SOCIAL_PLATFORMS.find((x) => x.id === platform)
  if (!p) return null
  const value = (rawValue ?? '').toString().trim().slice(0, MAX_VALUE)
  if (!value) return null

  let url: string
  let handle: string | null = null
  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value)
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
      url = u.toString()
    } catch {
      return null
    }
  } else {
    handle = cleanHandle(value)
    if (!handle || !/^[\p{L}\p{N}._\-+/]+$/u.test(handle)) return null
    if (p.id === 'whatsapp') handle = handle.replace(/[^0-9]/g, '')
    if (!handle) return null
    url = `${p.base}${handle}`
  }
  return {
    platform: p.id,
    label: p.label,
    value,
    handle,
    url,
    enabled: enabled !== false,
  }
}

export function parseSocialAccounts(json: string | null | undefined): SocialAccount[] {
  if (!json) return []
  try {
    const raw = JSON.parse(json)
    if (!Array.isArray(raw)) return []
    const out: SocialAccount[] = []
    for (const item of raw) {
      const acc = buildSocialAccount(item?.platform, item?.value, item?.enabled)
      if (acc && !out.some((a) => a.platform === acc.platform)) out.push(acc)
    }
    return out
  } catch {
    return []
  }
}

export async function readSocialAccounts(): Promise<SocialAccount[]> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: SOCIAL_ACCOUNTS_KEY },
  })
  return parseSocialAccounts(row?.value)
}

export async function writeSocialAccounts(accounts: SocialAccount[]): Promise<void> {
  const value = JSON.stringify(
    accounts.map((a) => ({ platform: a.platform, value: a.value, enabled: a.enabled }))
  )
  await prisma.siteSetting.upsert({
    where: { key: SOCIAL_ACCOUNTS_KEY },
    create: { key: SOCIAL_ACCOUNTS_KEY, value },
    update: { value },
  })
}
