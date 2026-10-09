import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAgencyPanel } from '@/lib/agency-access'
import { createBulkNotificationsWithPush } from '@/lib/notify'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'
const err = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })

/** GET /api/agency/announcements — ajansın duyuruları (ajansın her üyesi görür). */
export async function GET(req: NextRequest) {
  const gate = await requireAgencyPanel(req)
  if (gate instanceof NextResponse) return gate
  const rows = await prisma.agencyAnnouncement.findMany({
    where: { agencyId: gate.access.agency.id, deletedAt: null },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  })
  return NextResponse.json({ success: true, data: rows, canPost: gate.access.permissions.has('announce') })
}

/** POST /api/agency/announcements {title, body, pinned?, notify?} — duyuru + üyelere bildirim. */
export async function POST(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'announce')
  if (gate instanceof NextResponse) return gate
  const { user, access } = gate
  const body = await req.json().catch(() => ({}))
  const title = String(body.title || '').trim()
  const text = String(body.body || '').trim()
  if (title.length < 3 || title.length > 120) return err(400, 'Başlık 3–120 karakter olmalı')
  if (text.length < 3 || text.length > 3000) return err(400, 'Metin 3–3000 karakter olmalı')
  const recent = await prisma.agencyAnnouncement.count({
    where: { agencyId: access.agency.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  })
  if (recent >= 5) return err(429, 'Saatte en fazla 5 duyuru gönderilebilir')

  const a = await prisma.agencyAnnouncement.create({
    data: { agencyId: access.agency.id, authorId: user.id, title, body: text, pinned: body.pinned === true },
  })
  if (body.notify !== false) {
    const members = await prisma.agencyUser.findMany({
      where: { agencyId: access.agency.id, isActive: true, userId: { not: user.id } },
      select: { userId: true },
    })
    if (members.length) {
      createBulkNotificationsWithPush({
        userIds: members.map((m) => m.userId),
        type: 'agency_announcement',
        title: `${access.agency.name}: ${title}`,
        message: text.slice(0, 140),
        targetPath: '/ajans/yayinci',
        targetId: a.id,
      }).catch(() => {})
    }
  }
  recordAudit({ actorId: user.id, action: 'agency_announcement', targetType: 'agency', targetId: access.agency.id, metadata: { announcementId: a.id }, ip: getAuditIp(req) }).catch(() => {})
  return NextResponse.json({ success: true, data: a, message: 'Duyuru yayımlandı' })
}

/** DELETE /api/agency/announcements?id= — duyuruyu kaldırır (kayıt kalır). */
export async function DELETE(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'announce')
  if (gate instanceof NextResponse) return gate
  const id = new URL(req.url).searchParams.get('id') || ''
  const r = await prisma.agencyAnnouncement.updateMany({
    where: { id, agencyId: gate.access.agency.id, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  if (r.count !== 1) return err(404, 'Duyuru bulunamadı')
  return NextResponse.json({ success: true, message: 'Duyuru kaldırıldı' })
}
