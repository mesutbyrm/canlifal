import prisma from '@/lib/db'
import { createBulkNotificationsWithPush } from '@/lib/notify'

/**
 * Takipçilere "X canlı yayında" bildirimi (uygulama içi kayıt + tek kanal push).
 *
 * Aynı yayın için üç ayrı yol (`POST /api/video-streams`, `/live-started`,
 * `/api/live/create-room`) bu fonksiyonu çağırır; ortak `dedupeKey` sayesinde
 * bir takipçi aynı yayın için en fazla bir bildirim alır. Yalnız yayıncıyı
 * takip edenler hedeflenir (herkese gönderilmez).
 */
export async function notifyFollowersLiveStart(args: {
  streamerId: string
  streamerName: string
  streamId: string
  streamTitle?: string | null
}): Promise<number> {
  const followers = await prisma.follow.findMany({
    where: { followingId: args.streamerId },
    select: { followerId: true },
    take: 500,
  })
  if (followers.length === 0) return 0
  const title = `🔴 ${args.streamerName} canlı yayında`
  await createBulkNotificationsWithPush({
    userIds: followers.map(f => f.followerId),
    type: 'stream_live',
    title,
    message: args.streamTitle || 'Canlı Fal',
    data: JSON.stringify({ streamId: args.streamId }),
    fromUserId: args.streamerId,
    fromUserName: args.streamerName,
    targetPath: '/live',
    targetId: args.streamId,
    urgent: true,
    dedupeKey: `live_start:${args.streamId}`,
    dedupeWindowSeconds: 6 * 3600,
  })
  return followers.length
}
