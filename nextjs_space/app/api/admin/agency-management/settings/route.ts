import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac'
import { AGENCY_MGMT_KEYS, DISCOVERY_SORTS, getAgencyMgmtSettings, idList, setAgencyMgmtSetting } from '@/lib/agency-settings'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

/** GET — keşif sıralaması, vaat kuralları, uyarı eşikleri. */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'agency.manage')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ success: true, data: { keys: AGENCY_MGMT_KEYS, sorts: DISCOVERY_SORTS, values: await getAgencyMgmtSettings() } })
}

/** PUT {values: {key: value}} — yalnız bilinen anahtarlar, doğrulanarak. */
export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, 'agency.manage')
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => ({}))
  const values = (body?.values ?? {}) as Record<string, unknown>
  const known = new Set<string>(Object.values(AGENCY_MGMT_KEYS))
  const changed: Record<string, string> = {}
  for (const [key, raw] of Object.entries(values)) {
    if (!known.has(key)) continue
    let v = String(raw ?? '').trim()
    if (key === AGENCY_MGMT_KEYS.discoveryDefaultSort && !(DISCOVERY_SORTS as readonly string[]).includes(v)) {
      return NextResponse.json({ success: false, error: 'Geçersiz sıralama' }, { status: 400 })
    }
    if (key === AGENCY_MGMT_KEYS.discoveryFeatured || key === AGENCY_MGMT_KEYS.discoveryHidden) v = idList(v).join(',')
    if (key === AGENCY_MGMT_KEYS.promiseEnabled) v = v === 'false' ? 'false' : 'true'
    if (key === AGENCY_MGMT_KEYS.promiseAllowedPeriods) {
      v = idList(v).filter((p) => ['daily', 'weekly', 'monthly'].includes(p)).join(',')
      if (!v) return NextResponse.json({ success: false, error: 'En az bir hedef dönemi seçin' }, { status: 400 })
    }
    if ([AGENCY_MGMT_KEYS.promiseMaxBonus, AGENCY_MGMT_KEYS.promiseMaxTargetMinutes, AGENCY_MGMT_KEYS.alertTransferJeton,
      AGENCY_MGMT_KEYS.alertDailyOutflowJeton, AGENCY_MGMT_KEYS.alertRepeatCount, AGENCY_MGMT_KEYS.alertNewAccountDays].includes(key as any)) {
      const n = Math.floor(Number(v))
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ success: false, error: `${key} 0 veya pozitif sayı olmalı` }, { status: 400 })
      v = String(n)
    }
    await setAgencyMgmtSetting(key, v)
    changed[key] = v
  }
  recordAudit({ actorId: auth.user.id, action: 'admin_agency_mgmt_settings', targetType: 'settings', targetId: 'agency_management', metadata: changed, ip: getAuditIp(req) }).catch(() => {})
  return NextResponse.json({ success: true, data: await getAgencyMgmtSettings(), message: 'Ayarlar kaydedildi' })
}
