/**
 * Ajans üyelik geçmişi (AgencyMembershipHistory).
 *
 * `AgencyUser` tek aktif üyeliği tutar; ayrılmada satır silinir ya da başka
 * ajansa taşınır. Geçmiş bu tabloda kalır ve performans raporu, kullanıcının
 * hangi tarihlerde hangi ajansta olduğunu buradan okur.
 *
 * Yazımlar ana işlemden SONRA ve en iyi çaba ile yapılır: tablo henüz
 * `db push` edilmemişse ya da yazım başarısız olursa katılma/ayrılma işlemi
 * bozulmaz (yalnız uyarı loglanır — kişisel veri loglanmaz).
 */
import prisma from '@/lib/db'

export type MembershipEndedBy = 'user' | 'agency' | 'admin' | 'auto' | 'transfer'

export async function recordMembershipJoin(p: {
  agencyId: string
  userId: string
  role?: string
  via?: string | null
  actorId?: string | null
  joinedAt?: Date
}): Promise<void> {
  try {
    // Aynı ajansta açık kayıt varsa ikinci kez açma.
    const open = await prisma.agencyMembershipHistory.findFirst({
      where: { agencyId: p.agencyId, userId: p.userId, leftAt: null },
      select: { id: true },
    })
    if (open) return
    await prisma.agencyMembershipHistory.create({
      data: {
        agencyId: p.agencyId,
        userId: p.userId,
        role: p.role || 'member',
        joinedVia: p.via ?? null,
        actorId: p.actorId ?? null,
        joinedAt: p.joinedAt ?? new Date(),
      },
    })
  } catch {
    console.warn('[agency-history] katılma kaydı yazılamadı')
  }
}

export async function recordMembershipLeave(p: {
  agencyId: string
  userId: string
  endedBy: MembershipEndedBy
  reason?: string | null
  actorId?: string | null
  /** Geçmiş tablosundan önce katılmış üyeler için gerçek katılma tarihi. */
  joinedAt?: Date | null
  role?: string
}): Promise<void> {
  const now = new Date()
  try {
    const closed = await prisma.agencyMembershipHistory.updateMany({
      where: { agencyId: p.agencyId, userId: p.userId, leftAt: null },
      data: { leftAt: now, endedBy: p.endedBy, leaveReason: p.reason ?? null, actorId: p.actorId ?? null },
    })
    if (closed.count === 0) {
      // Tablo öncesi üyelik: katılma tarihiyle kapalı kayıt oluştur.
      await prisma.agencyMembershipHistory.create({
        data: {
          agencyId: p.agencyId,
          userId: p.userId,
          role: p.role || 'member',
          joinedAt: p.joinedAt ?? now,
          leftAt: now,
          endedBy: p.endedBy,
          leaveReason: p.reason ?? null,
          actorId: p.actorId ?? null,
        },
      })
    }
  } catch {
    console.warn('[agency-history] ayrılma kaydı yazılamadı')
  }
}

export type MembershipWindow = { start: Date; end: Date | null }

/**
 * Kullanıcının bu ajanstaki üyelik aralıkları. Geçmiş tablosu boşsa (eski
 * üyelik) aktif `AgencyUser.joinedAt` kullanılır.
 */
export async function membershipWindows(agencyId: string, userId: string): Promise<MembershipWindow[]> {
  let rows: { joinedAt: Date; leftAt: Date | null }[] = []
  try {
    rows = await prisma.agencyMembershipHistory.findMany({
      where: { agencyId, userId },
      select: { joinedAt: true, leftAt: true },
      orderBy: { joinedAt: 'asc' },
    })
  } catch {
    rows = []
  }
  const windows: MembershipWindow[] = rows.map((r) => ({ start: r.joinedAt, end: r.leftAt }))
  if (!windows.some((w) => w.end === null)) {
    const current = await prisma.agencyUser.findFirst({
      where: { agencyId, userId },
      select: { joinedAt: true },
    })
    if (current) windows.push({ start: current.joinedAt, end: null })
  }
  return windows
}

/** Kullanıcının tüm ajans geçmişi (en yeni önce) + ajans adları. */
export async function userMembershipHistory(userId: string) {
  let rows: any[] = []
  try {
    rows = await prisma.agencyMembershipHistory.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      take: 50,
    })
  } catch {
    rows = []
  }
  const current = await prisma.agencyUser.findUnique({
    where: { userId },
    select: { agencyId: true, role: true, joinedAt: true, joinedVia: true },
  })
  if (current && !rows.some((r) => r.agencyId === current.agencyId && !r.leftAt)) {
    rows.unshift({
      id: `current:${current.agencyId}`,
      agencyId: current.agencyId,
      userId,
      role: current.role,
      joinedVia: current.joinedVia,
      joinedAt: current.joinedAt,
      leftAt: null,
      leaveReason: null,
      endedBy: null,
    })
  }
  const ids = Array.from(new Set(rows.map((r) => r.agencyId)))
  const agencies = ids.length
    ? await prisma.agency.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, logoUrl: true } })
    : []
  const byId = new Map(agencies.map((a) => [a.id, a]))
  return rows.map((r) => ({
    id: r.id,
    agencyId: r.agencyId,
    agencyName: byId.get(r.agencyId)?.name ?? 'Silinmiş ajans',
    agencyLogo: byId.get(r.agencyId)?.logoUrl ?? null,
    role: r.role,
    joinedVia: r.joinedVia ?? null,
    joinedAt: r.joinedAt,
    leftAt: r.leftAt,
    endedBy: r.endedBy ?? null,
    leaveReason: r.leaveReason ?? null,
  }))
}
