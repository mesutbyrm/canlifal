import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAgencyPanel } from '@/lib/agency-access'
import { autoClosePeriods, closePeriod, payAccrual } from '@/lib/agency-accruals'
import { createNotificationWithPush } from '@/lib/notify'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'
const err = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })

/** GET /api/agency/accruals?status=&userId= — hak edişler. */
export async function GET(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'reports')
  if (gate instanceof NextResponse) return gate
  // Kapanmış dönemleri kendiliğinden değerlendir (ajans başına 10 dk'da bir).
  await autoClosePeriods(gate.access.agency.id).catch(() => null)
  const sp = new URL(req.url).searchParams
  const status = sp.get('status')
  const userId = sp.get('userId')
  const rows = await prisma.broadcasterAccrual.findMany({
    where: { agencyId: gate.access.agency.id, ...(status ? { status } : {}), ...(userId ? { userId } : {}) },
    orderBy: { periodStart: 'desc' },
    take: 300,
  })
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(new Set(rows.map((r) => r.userId))) } },
    select: { id: true, name: true, username: true, image: true },
  })
  const byId = new Map(users.map((u) => [u.id, u]))
  return NextResponse.json({ success: true, data: rows.map((r) => ({ ...r, user: byId.get(r.userId) ?? null })) })
}

/**
 * POST /api/agency/accruals
 *  {action:'close', period}           — kapanmış dönemi değerlendir (targets izni)
 *  {action:'pay', accrualId}          — bonusu ajans cüzdanından öde (yalnız sahip)
 *  {action:'void', accrualId, reason} — hak edişi iptal et (yalnız sahip; kayıt kalır)
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')
  const gate = await requireAgencyPanel(req, action === 'close' ? 'targets' : 'owner')
  if (gate instanceof NextResponse) return gate
  const { user, access } = gate
  const ip = getAuditIp(req)

  if (action === 'close') {
    const period = String(body.period || '')
    if (!['daily', 'weekly', 'monthly'].includes(period)) return err(400, 'Dönem daily, weekly veya monthly olmalı')
    const r = await closePeriod(access.agency.id, period as any)
    recordAudit({ actorId: user.id, action: 'agency_period_close', targetType: 'agency', targetId: access.agency.id, metadata: { period, ...r }, ip }).catch(() => {})
    return NextResponse.json({ success: true, data: r, message: r.created ? `${r.created} hak ediş hesaplandı` : 'Bu dönem zaten kapatılmış' })
  }

  const accrualId = String(body.accrualId || '')
  if (!accrualId) return err(400, 'accrualId gerekli')

  if (action === 'pay') {
    const me = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, username: true } })
    const r = await payAccrual({ accrualId, agencyId: access.agency.id, actorId: user.id, actorName: me?.username || me?.name || 'Ajans' })
    if (!r.ok) return err(r.status, r.message)
    const acc = await prisma.broadcasterAccrual.findUnique({ where: { id: accrualId } })
    if (acc) {
      createNotificationWithPush({
        userId: acc.userId,
        type: 'agency_bonus_paid',
        title: 'Hedef bonusu yüklendi',
        message: `${access.agency.name}: ${acc.bonusJeton} Jeton hedef bonusu hesabınıza yüklendi.`,
        targetPath: '/ajans/yayinci',
      }).catch(() => {})
    }
    recordAudit({ actorId: user.id, action: 'agency_accrual_pay', targetType: 'agency', targetId: access.agency.id, metadata: { accrualId }, ip }).catch(() => {})
    return NextResponse.json({ success: true, message: r.message })
  }

  if (action === 'void') {
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 200) : ''
    if (reason.length < 3) return err(400, 'İptal gerekçesi gerekli')
    const r = await prisma.broadcasterAccrual.updateMany({
      where: { id: accrualId, agencyId: access.agency.id, status: 'earned' },
      data: { status: 'void' },
    })
    if (r.count !== 1) return err(409, 'Yalnız ödenmemiş hak ediş iptal edilebilir')
    recordAudit({ actorId: user.id, action: 'agency_accrual_void', targetType: 'agency', targetId: access.agency.id, metadata: { accrualId, reason }, ip }).catch(() => {})
    return NextResponse.json({ success: true, message: 'Hak ediş iptal edildi' })
  }

  return err(400, 'Geçersiz işlem')
}
