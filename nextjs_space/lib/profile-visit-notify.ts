/**
 * Profil ziyareti bildirimi — «X profilini ziyaret etti».
 * Gizli gezinti (VIP) açıksa ve kendi profiline bakışta bildirim gitmez;
 * aynı ziyaretçi için 6 saatte bir (notify.ts dedupe penceresi).
 */
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'

export async function notifyProfileVisit(
  visitorId: string,
  profileId: string,
  isHidden: boolean,
): Promise<void> {
  if (!visitorId || !profileId || visitorId === profileId || isHidden) return
  try {
    const visitor = await prisma.user.findUnique({
      where: { id: visitorId },
      select: { name: true, username: true },
    })
    const name = visitor?.name || visitor?.username || 'Birisi'
    await createNotificationWithPush({
      userId: profileId,
      type: 'profile_view',
      title: '👁️ Profilin ziyaret edildi',
      message: 'profilini ziyaret etti',
      fromUserId: visitorId,
      fromUserName: name,
      targetPath: 'profile',
      targetId: visitorId,
      ...(visitor?.username
        ? { deepLinkType: 'profile' as const, deepLinkValue: visitor.username }
        : {}),
    })
  } catch {
    // Bildirim hatası ziyareti engellemesin.
  }
}
