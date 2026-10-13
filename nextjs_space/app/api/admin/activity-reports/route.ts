import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getStaffSession } from '@/lib/admin-auth'
import { staffCan } from '@/lib/permissions'
import { parseReportDates } from '@/lib/report-filters'
import { syncRoomActivity, ROOM_ACTIVITY_COVERAGE } from '@/lib/room-activity'
import { activityTotals, spanEnd } from '@/lib/room-activity-math'
import { getCached } from '@/lib/cache'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.user?.id) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  if (!(await staffCan(session.user.role, session.user.id, 'analytics.live.view', ['admin','yonetici','moderator','finans']))) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  const p = req.nextUrl.searchParams
  const kind = p.get('kind') || 'room', status = p.get('status') || 'all', page = Number(p.get('page') || 1)
  if (!['room','teller','stream'].includes(kind) || !['all','active','closed'].includes(status) || !Number.isInteger(page) || page < 1 || page > 200) return NextResponse.json({ error: 'Geçersiz rapor filtresi' }, { status: 400 })
  let dates
  try { dates = parseReportDates(p) } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }) }
  try {
    const roomId = p.get('roomId'), userId = p.get('userId'), tellerId = p.get('tellerId'), sessionId = p.get('sessionId')
    const data = await getCached(`activity-report:${p.toString()}`, 15, async () => {
      const now = new Date(), skip = (page - 1) * 20, take = 20
      if (kind === 'room') {
        // Reconcile only requested room. Never sweep all production rooms for a report.
        if (roomId) await syncRoomActivity(roomId)
        const where = { ...(roomId ? { roomId } : {}), ...(userId ? { spans: { some: { userId } } } : {}), ...(sessionId ? { id: sessionId } : {}), ...(dates ? { startedAt: dates } : {}), ...(status === 'active' ? { endedAt: null } : status === 'closed' ? { endedAt: { not: null } } : {}) }
        const [rows, total] = await Promise.all([
          prisma.roomActivitySession.findMany({ where, orderBy: [{ startedAt: 'desc' }, { id: 'asc' }], take, skip, include: { spans: true } }),
          prisma.roomActivitySession.count({ where }),
        ])
        return { total, coverage: ROOM_ACTIVITY_COVERAGE + ' Belirli oda seçildiğinde kapanış uzlaştırılır; genel listede henüz uzlaştırılmamış oturumlar bulunabilir.', rows: rows.map(row => {
          const totals = activityTotals(row.spans, row.startedAt, row.endedAt || now)
          return { id: row.id, roomId: row.roomId, userId: row.ownerId, startedAt: row.startedAt, endedAt: row.endedAt, status: row.endedAt ? 'closed' : 'active', ...totals, closureReport: row.closureReport,
            durationSeconds: Math.max(0, Math.round(((row.endedAt?.getTime() ?? Math.max(row.startedAt.getTime(), ...row.spans.map(s => spanEnd(s, now).getTime()))) - row.startedAt.getTime()) / 1000)),
            spanCount: row.spans.length,
          }
        }) }
      }
      if (kind === 'teller') {
        const where = { ...(userId ? { OR: [{ userId }, { teller: { userId } }] } : {}), ...(tellerId ? { tellerId } : {}), ...(sessionId ? { id: sessionId } : {}), ...(dates ? { createdAt: dates } : {}), ...(status === 'active' ? { status: 'active' } : status === 'closed' ? { status: { in: ['completed','cancelled','rejected','expired'] } } : {}) }
        const [rows,total] = await Promise.all([prisma.liveSession.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take, skip, select: { id: true, tellerId: true, userId: true, startedAt: true, endedAt: true, createdAt: true, status: true, minutesUsed: true, creditsCharged: true, teller: { select: { displayName: true } } } }), prisma.liveSession.count({ where })])
        return { total, coverage: 'Falcı seansının saklanan başlangıç/bitiş aralığıdır; konuşma süresi değildir. minutesUsed ayrıca tutulan kullanılan dakikadır. Başlangıcı veya kapanış tarihi eksik kayıtların süresi uydurulmaz.', rows: rows.map(row => ({ ...row, durationSeconds: row.startedAt && (row.endedAt || row.status === 'active') ? Math.max(0,Math.round(((row.endedAt || now).getTime() - row.startedAt.getTime()) / 1000)) : null })) }
      }
      const where = { ...(roomId ? { OR: [{ id: roomId }, { roomId }] } : {}), ...(userId ? { userId } : {}), ...(sessionId ? { id: sessionId } : {}), ...(dates ? { createdAt: dates } : {}), ...(status === 'active' ? { status: 'live' } : status === 'closed' ? { status: 'ended' } : {}) }
      const [rows,total] = await Promise.all([prisma.videoStream.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take, skip, select: { id: true, title: true, roomId: true, userId: true, startedAt: true, endedAt: true, createdAt: true, status: true } }), prisma.videoStream.count({ where })])
      return { total, coverage: 'Yayının saklanan başlangıç/bitiş aralığıdır. Eksik başlangıç veya bitiş tarihi tahmin edilmez.', rows: rows.map(row => ({ ...row, durationSeconds: row.startedAt && (row.endedAt || row.status === 'live') ? Math.max(0,Math.round(((row.endedAt || now).getTime() - row.startedAt.getTime()) / 1000)) : null })) }
    })
    return NextResponse.json({ ...data, page, totalPages: Math.ceil(data.total / 20), timeZone: 'Europe/Istanbul' })
  } catch (error) {
    console.error('[activity-reports]',error)
    return NextResponse.json({ error: 'Faaliyet raporu alınamadı' }, { status: 500 })
  }
}
