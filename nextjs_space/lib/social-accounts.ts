import prisma from '@/lib/db'

export const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'x', label: 'X (Twitter)' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'website', label: 'Web sitesi' },
] as const

const SETTING_KEY = 'site.social_accounts_v1'
export type StoredSocialAccount = { platform: string; value: string; enabled: boolean }
export type PublicSocialAccount = { platform: string; label: string; value: string; handle?: string; url: string; enabled: boolean }

function stripAt(value: string): string { return value.trim().replace(/^@+/, '') }

export function socialAccountUrl(platform: string, raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const handle = stripAt(value)
  switch (platform) {
    case 'instagram': return `https://instagram.com/${handle}`
    case 'tiktok': return `https://www.tiktok.com/@${handle}`
    case 'youtube': return handle.startsWith('UC') || handle.includes('/') ? `https://www.youtube.com/${handle}` : `https://www.youtube.com/@${handle}`
    case 'x': return `https://x.com/${handle}`
    case 'facebook': return `https://facebook.com/${handle}`
    case 'telegram': return handle.startsWith('+') ? `https://t.me/${handle.slice(1)}` : `https://t.me/${handle}`
    case 'whatsapp': return `https://wa.me/${handle.replace(/\D/g, '')}`
    case 'website': return handle.includes('.') ? (handle.startsWith('http') ? handle : `https://${handle}`) : ''
    default: return ''
  }
}

async function readStored(): Promise<StoredSocialAccount[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } })
  if (!row?.value) return []
  try {
    const parsed: unknown = JSON.parse(row.value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item: any) => item && typeof item.platform === 'string').map((item: any) => ({ platform: String(item.platform), value: String(item.value ?? item.handle ?? ''), enabled: item.enabled !== false }))
  } catch { return [] }
}

export async function loadSocialAccounts(): Promise<PublicSocialAccount[]> {
  const stored = await readStored()
  const byPlatform = new Map(stored.map((item) => [item.platform, item]))
  return SOCIAL_PLATFORMS.map(({ id, label }) => {
    const item = byPlatform.get(id)
    const value = item?.value?.trim() ?? ''
    const enabled = item?.enabled !== false && value.length > 0
    return { platform: id, label, value, handle: value ? stripAt(value) : undefined, url: value ? socialAccountUrl(id, value) : '', enabled }
  })
}

export async function saveSocialAccounts(rows: Array<{ platform: string; value?: string; enabled?: boolean }>): Promise<PublicSocialAccount[]> {
  const byPlatform = new Map<string, StoredSocialAccount>()
  for (const row of rows) {
    const platform = String(row.platform || '').trim()
    if (!platform) continue
    const value = String(row.value ?? '').trim()
    byPlatform.set(platform, { platform, value, enabled: Boolean(value) && row.enabled !== false })
  }
  const merged: StoredSocialAccount[] = SOCIAL_PLATFORMS.map(({ id }) => byPlatform.get(id) ?? { platform: id, value: '', enabled: false })
  await prisma.siteSetting.upsert({ where: { key: SETTING_KEY }, create: { key: SETTING_KEY, value: JSON.stringify(merged) }, update: { value: JSON.stringify(merged) } })
  return loadSocialAccounts()
}
