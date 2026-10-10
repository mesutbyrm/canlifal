/**
 * Ajans yönetimi admin ayarları (platformSettings anahtarları — şema gerektirmez).
 */
import prisma from '@/lib/db'
import { getCachedPlatformSetting, invalidateCache } from '@/lib/cache'

export const AGENCY_MGMT_KEYS = {
  discoveryDefaultSort: 'agency.discovery.default_sort',
  discoveryFeatured: 'agency.discovery.featured', // virgüllü ajans id
  discoveryHidden: 'agency.discovery.hidden', // virgüllü ajans id
  promiseEnabled: 'agency.promise.enabled',
  promiseMaxBonus: 'agency.promise.max_bonus_jeton',
  promiseMaxTargetMinutes: 'agency.promise.max_target_minutes',
  promiseAllowedPeriods: 'agency.promise.allowed_periods',
  alertTransferJeton: 'agency.alert.single_transfer_jeton',
  alertDailyOutflowJeton: 'agency.alert.daily_outflow_jeton',
  alertRepeatCount: 'agency.alert.repeat_target_count',
  alertNewAccountDays: 'agency.alert.new_account_days',
} as const

export const DISCOVERY_SORTS = ['recommended', 'hours', 'members', 'success', 'level', 'newest'] as const
export type DiscoverySort = (typeof DISCOVERY_SORTS)[number]

const DEFAULTS: Record<string, string> = {
  [AGENCY_MGMT_KEYS.discoveryDefaultSort]: 'recommended',
  [AGENCY_MGMT_KEYS.discoveryFeatured]: '',
  [AGENCY_MGMT_KEYS.discoveryHidden]: '',
  [AGENCY_MGMT_KEYS.promiseEnabled]: 'true',
  [AGENCY_MGMT_KEYS.promiseMaxBonus]: '100000',
  [AGENCY_MGMT_KEYS.promiseMaxTargetMinutes]: '20000',
  [AGENCY_MGMT_KEYS.promiseAllowedPeriods]: 'daily,weekly,monthly',
  [AGENCY_MGMT_KEYS.alertTransferJeton]: '50000',
  [AGENCY_MGMT_KEYS.alertDailyOutflowJeton]: '200000',
  [AGENCY_MGMT_KEYS.alertRepeatCount]: '5',
  [AGENCY_MGMT_KEYS.alertNewAccountDays]: '3',
}

export async function getAgencyMgmtSetting(key: string): Promise<string> {
  return getCachedPlatformSetting(key, DEFAULTS[key] ?? '')
}

export async function getAgencyMgmtSettings(): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const key of Object.values(AGENCY_MGMT_KEYS)) out[key] = await getAgencyMgmtSetting(key)
  return out
}

export async function setAgencyMgmtSetting(key: string, value: string): Promise<void> {
  await prisma.platformSettings.upsert({ where: { key }, update: { value }, create: { key, value } })
  invalidateCache(`platform:${key}`)
  invalidateCache('agencies:discovery')
}

export function idList(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export async function promiseRules() {
  const periods = idList(await getAgencyMgmtSetting(AGENCY_MGMT_KEYS.promiseAllowedPeriods)).filter((p) =>
    ['daily', 'weekly', 'monthly'].includes(p),
  )
  return {
    enabled: (await getAgencyMgmtSetting(AGENCY_MGMT_KEYS.promiseEnabled)) !== 'false',
    maxBonusJeton: Math.max(0, parseInt(await getAgencyMgmtSetting(AGENCY_MGMT_KEYS.promiseMaxBonus), 10) || 0),
    maxTargetMinutes: Math.max(0, parseInt(await getAgencyMgmtSetting(AGENCY_MGMT_KEYS.promiseMaxTargetMinutes), 10) || 0),
    allowedPeriods: periods.length ? periods : ['weekly'],
  }
}
