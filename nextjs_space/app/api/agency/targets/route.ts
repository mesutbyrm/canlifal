import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAgencyPanel } from '@/lib/agency-access'
import { promiseRules } from '@/lib/agency-settings'
import { activeTargetWhere } from '@/lib/agency-performance'
import { createNotificationWithPush } from '@/lib/notify'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'
const err = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })

/** GET /api/agency/targets[?userId=] — aktif hedefler (+ ?history=1 kapanmışlar). */
export async function GET(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'reports')
  if (gate instanceof NextResponse) return gate
  const sp = new URL(req.url).searchParams
  const userId = sp.get('userId')
  const rows = await prisma.broadcasterTarget.findMany({
    where: { agencyId: gate.access.agency.id, ...(userId ? { userId } : {}), ...(sp.get('history') === '1' ? {} : activeTargetWhere()) },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })
  return NextResponse.json({ success: true, data: rows })
}

/**
 * POST /api/agency/targets {userId, period, targetMinutes, minDays?, bonusJeton?}
 * Aynı dönem için önceki aktif hedef kapanır (geçmiş korunur), yenisi açılır.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'targets')
  if (gate instanceof NextResponse) return gate
  const { user, access } = gate
  const body = await req.json().catch(() => ({}))
  const userId = String(body.userId || '')
  const period = String(body.period || '')
  const targetMinutes = Math.floor(Number(body.targetMinutes))
  const minDays = body.minDays ? Math.floor(Number(body.minDays)) : null
  const bonusJeton = Math.max(0, Math.floor(Number(body.bonusJeton || 0)))
  const rules = await promiseRules()
  if (!['daily', 'weekly', 'monthly'].includes(period)) return err(400, 'Dönem daily, weekly veya monthly olmalı')
  if (!Number.isFinite(targetMinutes) || targetMinutes <= 0) return err(400, 'Hedef dakika pozitif olmalı')
  if (rules.maxTargetMinutes > 0 && targetMinutes > rules.maxTargetMinutes) return err(400, `Hedef en fazla ${rules.maxTargetMinutes} dakika olabilir`)
  if (rules.maxBonusJeton > 0 && bonusJeton > rules.maxBonusJeton) return err(400, `Bonus en fazla ${rules.maxBonusJeton} Jeton olabilir`)
  const maxDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : 31
  if (minDays != null && (minDays < 1 || minDays > maxDays)) return err(400, `Gün sayısı 1–${maxDays} olmalı`)

  const member = await prisma.agencyUser.findUnique({ where: { userId }, select: { agencyId: true, isActive: true } })
  if (!member || member.agencyId !== access.agency.id || !member.isActive) return err(404, 'Kullanıcı ajansınızın aktif üyesi değil')

  const now = new Date()
  const target = await prisma.$transaction(async (tx: any) => {
    await tx.broadcasterTarget.updateMany({
      where: { agencyId: access.agency.id, userId, period, ...activeTargetWhere(now) },
      data: { endsAt: now },
    })
    return tx.broadcasterTarget.create({
      data: { agencyId: access.agency.id, userId, period, targetMinutes, minDays, bonusJeton, startsAt: now, createdById: user.id },
    })
  })
  const label = period === 'daily' ? 'günlük' : period === 'weekly' ? 'haftalık' : 'aylık'
  createNotificationWithPush({
    userId,
    type: 'agency_target',
    title: 'Yeni yayın hedefi',
    message: `${access.agency.name}: ${label} ${Math.round(targetMinutes / 60 * 10) / 10} saat${bonusJeton ? ` · bonus ${bonusJeton} Jeton` : ''}`,
    targetPath: '/ajans/yayinci',
  }).catch(() => {})
  recordAudit({ actorId: user.id, action: 'agency_target_set', targetType: 'agency', targetId: access.agency.id, metadata: { userId, period, targetMinutes, bonusJeton }, ip: getAuditIp(req) }).catch(() => {})
  return NextResponse.json({ success: true, data: target, message: 'Hedef kaydedildi' })
}

/** DELETE /api/agency/targets?id= — hedefi kapatır (silmez). */
export async function DELETE(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'targets')
  if (gate instanceof NextResponse) return gate
  const id = new URL(req.url).searchParams.get('id') || ''
  const r = await prisma.broadcasterTarget.updateMany({
    where: { id, agencyId: gate.access.agency.id, ...activeTargetWhere() },
    data: { endsAt: new Date() },
  })
  if (r.count !== 1) return err(404, 'Aktif hedef bulunamadı')
  return NextResponse.json({ success: true, message: 'Hedef kapatıldı' })
}
