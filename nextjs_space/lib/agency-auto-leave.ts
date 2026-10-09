import prisma from '@/lib/db'
import { recordMembershipLeave } from '@/lib/agency-membership-history'
import { createNotificationWithPush } from '@/lib/notify'

/**
 * 3 gün sebepsiz çıkış kuralı.
 *
 * Bir üye ajanstan çıkma talebi oluşturduğunda (AgencyLeaveRequest, status=pending),
 * ajans sahibi/yöneticisi 3 gün içinde onaylamaz veya reddetmezse talep OTOMATİK
 * onaylanır ve üye ajanstan çıkarılır. Böylece üyeler ajansta rehin kalmaz.
 *
 * Bu fonksiyon tembel (lazy) olarak ajans uçları okunduğunda ve ayrıca bir cron
 * uç noktasından periyodik olarak çağrılabilir. Idempotenttir.
 */

export const AUTO_LEAVE_DAYS = 3

export interface AutoLeaveResult {
  processed: number
  removedUserIds: string[]
}

/**
 * Belirli bir ajans (agencyId verilirse) veya tüm ajanslar için 3 günden eski
 * bekleyen çıkış taleplerini otomatik onaylar.
 */
export async function processExpiredLeaveRequests(agencyId?: string): Promise<AutoLeaveResult> {
  const threshold = new Date(Date.now() - AUTO_LEAVE_DAYS * 24 * 60 * 60 * 1000)

  const expired = await prisma.agencyLeaveRequest.findMany({
    where: {
      status: 'pending',
      createdAt: { lte: threshold },
      ...(agencyId ? { agencyId } : {}),
    },
    include: {
      agency: { select: { id: true, name: true, ownerId: true } },
    },
    take: 200,
  })

  const removedUserIds: string[] = []

  for (const req of expired) {
    try {
      let removed: { joinedAt: Date; role: string } | null = null
      await prisma.$transaction(async (tx) => {
        // Talebi tekrar kilitli oku — yarış koşulunu önle
        const fresh = await tx.agencyLeaveRequest.findUnique({ where: { id: req.id } })
        if (!fresh || fresh.status !== 'pending') return

        // Talebi otomatik onayla
        await tx.agencyLeaveRequest.update({
          where: { id: req.id },
          data: {
            status: 'approved',
            reviewedBy: 'system',
            reviewNote: `${AUTO_LEAVE_DAYS} gün içinde yanıtlanmadığı için otomatik onaylandı`,
            reviewedAt: new Date(),
          },
        })

        // Üyeyi ajanstan çıkar (sahip asla otomatik çıkarılmaz)
        const member = await tx.agencyUser.findUnique({ where: { userId: req.userId } })
        if (member && member.agencyId === req.agencyId && req.userId !== req.agency.ownerId) {
          await tx.agencyUser.delete({ where: { id: member.id } })
          removed = { joinedAt: member.joinedAt, role: member.role }
          await tx.agency.update({
            where: { id: req.agencyId },
            data: {
              totalMembers: { decrement: 1 },
              activeMembers: member.isActive ? { decrement: 1 } : undefined,
            },
          })
          removedUserIds.push(req.userId)
        }
      })
      const gone = removed as { joinedAt: Date; role: string } | null
      if (gone) {
        await recordMembershipLeave({ agencyId: req.agencyId, userId: req.userId, endedBy: 'auto', reason: req.reason ?? null, joinedAt: gone.joinedAt, role: gone.role })
      }

      // Bildirim (transaction dışında)
      await createNotificationWithPush({
        userId: req.userId,
        type: 'agency_leave_auto_approved',
        title: 'Ajanstan Ayrıldınız',
        message: `Çıkış talebiniz ${AUTO_LEAVE_DAYS} gün içinde yanıtlanmadığı için otomatik onaylandı ve ${req.agency.name} ajansından ayrıldınız.`,
        targetPath: '/ajans',
      }).catch(() => {})
    } catch (err) {
      console.error('[agency-auto-leave] talep işlenemedi:', req.id, err)
    }
  }

  return { processed: removedUserIds.length, removedUserIds }
}
