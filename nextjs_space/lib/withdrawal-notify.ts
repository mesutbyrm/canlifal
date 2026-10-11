import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
import { sendNotificationEmail } from '@/lib/email-service'

/**
 * Çekim talebi durum geçişlerinde kullanıcıya bildirim gönderir:
 * uygulama içi bildirim + mobil push + e-posta (hepsi best-effort).
 */

type WithdrawalStatus =
  | 'agency_approved'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled'

interface NotifyArgs {
  userId: string
  status: WithdrawalStatus
  amount: number
  amountTL?: number | null
  note?: string | null
}

const COPY: Record<WithdrawalStatus, { title: string; body: (a: NotifyArgs) => string }> = {
  agency_approved: {
    title: 'Çekim Talebiniz Ajans Tarafından Onaylandı',
    body: (a) => `${a.amount} jetonınız için çekim talebiniz ajans tarafından onaylandı ve yönetici onayına iletildi.`,
  },
  approved: {
    title: 'Çekim Talebiniz Onaylandı',
    body: (a) => `${a.amount} jeton${a.amountTL ? ` (${a.amountTL} TL)` : ''} tutarındaki çekim talebiniz onaylandı. Ödeme kısa sürede işleme alınacak.`,
  },
  rejected: {
    title: 'Çekim Talebiniz Reddedildi',
    body: (a) => `${a.amount} jeton tutarındaki çekim talebiniz reddedildi.${a.note ? ` Not: ${a.note}` : ''}`,
  },
  cancelled: {
    title: 'Çekim Talebiniz İptal Edildi',
    body: (a) => `${a.amount} jeton tutarındaki çekim talebiniz iptal edildi. Bakiyenizden jeton düşülmedi.${a.note ? ` Not: ${a.note}` : ''}`,
  },
  completed: {
    title: 'Çekim Ödemeniz Tamamlandı',
    body: (a) => `${a.amount} jeton${a.amountTL ? ` (${a.amountTL} TL)` : ''} tutarındaki çekim ödemeniz tamamlandı.`,
  },
}

export async function notifyWithdrawalStatus(args: NotifyArgs): Promise<void> {
  const copy = COPY[args.status]
  if (!copy) return
  const title = copy.title
  const message = copy.body(args)

  // Uygulama içi + push
  await createNotificationWithPush({
    userId: args.userId,
    type: `withdrawal_${args.status}`,
    title,
    message,
    targetPath: '/cuzdan',
    urgent: args.status === 'approved' || args.status === 'completed',
  }).catch((e) => console.error('[withdrawal-notify] push error:', e))

  // E-posta (best-effort)
  try {
    const notifId = process.env.NOTIF_ID_DEME_BILDIRIMI
    if (!notifId) return
    const user = await prisma.user.findUnique({
      where: { id: args.userId },
      select: { email: true, name: true },
    })
    if (!user?.email) return
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
      <h2 style="color:#7c3aed;margin:0 0 12px">${title}</h2>
      <p style="font-size:15px;line-height:1.6">Merhaba ${user.name || ''},</p>
      <p style="font-size:15px;line-height:1.6">${message}</p>
      <p style="font-size:13px;color:#6b7280;margin-top:24px">Canlıfal</p>
    </div>`
    await sendNotificationEmail({
      notificationId: notifId,
      recipientEmail: user.email,
      subject: title,
      htmlBody: html,
    })
  } catch (e) {
    console.error('[withdrawal-notify] email error:', e)
  }
}
