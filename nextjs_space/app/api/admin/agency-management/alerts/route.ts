import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac'
import { computeAgencyAlerts } from '@/lib/agency-alerts'

export const dynamic = 'force-dynamic'

/** GET /api/admin/agency-management/alerts?days=7 — şüpheli işlem uyarıları (anlık hesap). */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'agency.report.view')
  if (auth instanceof NextResponse) return auth
  const days = parseInt(new URL(req.url).searchParams.get('days') || '7', 10) || 7
  const alerts = await computeAgencyAlerts(days)
  return NextResponse.json({ success: true, data: { days, count: alerts.length, alerts: alerts.slice(0, 500) } })
}
