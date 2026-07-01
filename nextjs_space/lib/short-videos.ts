import prisma from '@/lib/db'

/** Güvenli sayı — Infinity/NaN/null -> 0 */
export function safeInt(v: any): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.trunc(n))
}

export function safeFloat(v: any): number | null {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return n
}

/** Açıklamadan @mention kullanıcı adlarını çıkar (küçük harf, benzersiz) */
export function parseMentions(text: string | null | undefined): string[] {
  if (!text) return []
  const matches = text.match(/@([a-zA-Z0-9_\.]{2,30})/g) || []
  const set = new Set<string>()
  for (const m of matches) set.add(m.slice(1).toLowerCase())
  return Array.from(set).slice(0, 30)
}

/** Açıklamadan #hashtag'leri çıkar (küçük harf normalize, benzersiz) */
export function parseHashtags(text: string | null | undefined): string[] {
  if (!text) return []
  // Türkçe karakter + harf/rakam/altçizgi
  const matches = text.match(/#([\p{L}\p{N}_]{1,50})/gu) || []
  const set = new Set<string>()
  for (const m of matches) {
    const tag = m.slice(1).toLocaleLowerCase('tr-TR')
    if (tag) set.add(tag)
  }
  return Array.from(set).slice(0, 30)
}

/** Görünürlük normalize */
export function normalizeVisibility(v: any): string {
  const allowed = ['everyone', 'followers', 'close_friends', 'private']
  return allowed.includes(v) ? v : 'everyone'
}

/** Yorum ayarı normalize */
export function normalizeCommentSetting(v: any): string {
  const allowed = ['everyone', 'followers', 'off']
  return allowed.includes(v) ? v : 'everyone'
}

export interface AuthorDTO {
  id: string
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export function mapAuthor(user: any): AuthorDTO {
  return {
    id: user?.id ?? '',
    userId: user?.id ?? '',
    username: user?.username || user?.name || 'user',
    displayName: user?.name || user?.username || 'Kullanıcı',
    avatarUrl: user?.image ?? null,
  }
}

/** ShortVideo -> DTO (null-safe) */
export function mapVideo(v: any, authUserId?: string | null): any {
  return {
    id: v.id,
    userId: v.userId,
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl ?? null,
    description: v.description ?? '',
    durationSec: safeFloat(v.durationSec),
    viewsCount: safeInt(v.viewsCount),
    likesCount: safeInt(v.likesCount),
    commentsCount: safeInt(v.commentsCount),
    sharesCount: safeInt(v.sharesCount),
    savesCount: safeInt(v.savesCount),
    visibility: v.visibility ?? 'everyone',
    commentSetting: v.commentSetting ?? 'everyone',
    allowDuet: v.allowDuet ?? true,
    location: v.locationName
      ? { name: v.locationName, lat: safeFloat(v.locationLat), lng: safeFloat(v.locationLng) }
      : null,
    music: v.music
      ? {
          id: v.music.id,
          title: v.music.title,
          artist: v.music.artist ?? null,
          audioUrl: v.music.audioUrl,
          coverUrl: v.music.coverUrl ?? null,
          durationSec: safeFloat(v.music.durationSec),
        }
      : null,
    duetOfId: v.duetOfId ?? null,
    hashtags: Array.isArray(v.hashtags)
      ? v.hashtags.map((h: any) => h.hashtag?.name).filter(Boolean)
      : [],
    createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
    author: mapAuthor(v.user),
    likedByMe: authUserId ? (v.likes?.length ?? 0) > 0 : false,
    viewedByMe: authUserId ? (v.views?.length ?? 0) > 0 : false,
    savedByMe: authUserId ? (v.saves?.length ?? 0) > 0 : false,
  }
}

/**
 * Bir açıklamadaki mention'ları çözümle, ShortVideoMention kayıtları + bildirim üret.
 * Yalnızca gerçek (var olan) kullanıcılar eşleştirilir.
 */
export async function syncVideoMentions(
  videoId: string,
  authorId: string,
  authorName: string,
  description: string | null | undefined
): Promise<string[]> {
  const usernames = parseMentions(description)
  if (usernames.length === 0) return []
  const users = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true, username: true },
  })
  const mentionedIds: string[] = []
  for (const u of users) {
    if (u.id === authorId) continue
    try {
      await prisma.shortVideoMention.upsert({
        where: { videoId_mentionedUserId: { videoId, mentionedUserId: u.id } },
        update: {},
        create: { videoId, mentionedUserId: u.id },
      })
      mentionedIds.push(u.id)
    } catch {}
  }
  return mentionedIds
}

/**
 * Açıklamadaki hashtag'leri Hashtag + ShortVideoHashtag tablolarına yaz.
 */
export async function syncVideoHashtags(
  videoId: string,
  description: string | null | undefined
): Promise<string[]> {
  const tags = parseHashtags(description)
  if (tags.length === 0) return []
  const linked: string[] = []
  for (const name of tags) {
    try {
      const hashtag = await prisma.hashtag.upsert({
        where: { name },
        update: {},
        create: { name },
      })
      const existing = await prisma.shortVideoHashtag.findUnique({
        where: { videoId_hashtagId: { videoId, hashtagId: hashtag.id } },
        select: { id: true },
      })
      if (!existing) {
        await prisma.shortVideoHashtag.create({
          data: { videoId, hashtagId: hashtag.id },
        })
        await prisma.hashtag.update({
          where: { id: hashtag.id },
          data: { videosCount: { increment: 1 } },
        }).catch(() => {})
      }
      linked.push(name)
    } catch {}
  }
  return linked
}

export interface CreateShortVideoInput {
  userId: string
  authorName: string
  videoUrl: string
  thumbnailUrl?: string | null
  description?: string | null
  durationSec?: number | null
  visibility?: any
  commentSetting?: any
  allowDuet?: boolean
  locationName?: string | null
  locationLat?: number | null
  locationLng?: number | null
  musicId?: string | null
  duetOfId?: string | null
}

/**
 * Ortak kısa video oluşturma mantığı (upload + register route'ları paylaşır).
 * Müzik/duet doğrulaması, kayıt, müzik sayacı, mention+hashtag senkronu,
 * ve mention bildirimlerini (fire-and-forget) yapar. mapVideo DTO döndürür.
 */
export async function createShortVideoRecord(input: CreateShortVideoInput): Promise<any> {
  const { createNotificationWithPush } = await import('@/lib/notify')

  const description = (input.description || '').slice(0, 500) || null

  // Müzik geçerli mi?
  let validMusicId: string | null = null
  if (input.musicId) {
    const music = await prisma.shortVideoMusic.findUnique({
      where: { id: input.musicId },
      select: { id: true },
    })
    if (music) validMusicId = music.id
  }
  // Duet kaynağı geçerli mi + izin var mı?
  let validDuetOfId: string | null = null
  if (input.duetOfId) {
    const src = await prisma.shortVideo.findUnique({
      where: { id: input.duetOfId },
      select: { id: true, allowDuet: true },
    })
    if (src && src.allowDuet) validDuetOfId = src.id
  }

  const video = await prisma.shortVideo.create({
    data: {
      userId: input.userId,
      videoUrl: input.videoUrl,
      thumbnailUrl: input.thumbnailUrl ?? null,
      description,
      durationSec: input.durationSec ?? null,
      visibility: normalizeVisibility(input.visibility),
      commentSetting: normalizeCommentSetting(input.commentSetting),
      allowDuet: input.allowDuet !== false,
      locationName: input.locationName ?? null,
      locationLat: input.locationLat ?? null,
      locationLng: input.locationLng ?? null,
      musicId: validMusicId,
      duetOfId: validDuetOfId,
    },
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
      music: true,
      hashtags: { include: { hashtag: { select: { name: true } } } },
    },
  })

  if (validMusicId) {
    await prisma.shortVideoMusic.update({
      where: { id: validMusicId },
      data: { usesCount: { increment: 1 } },
    }).catch(() => {})
  }

  ;(async () => {
    try {
      const mentionedIds = await syncVideoMentions(video.id, input.userId, input.authorName, description)
      await syncVideoHashtags(video.id, description)
      for (const uid of mentionedIds) {
        await createNotificationWithPush({
          userId: uid,
          type: 'short_video_mention',
          title: 'Bir videoda etiketlendin',
          message: `${input.authorName} bir videoda senden bahsetti`,
          fromUserId: input.userId,
          fromUserName: input.authorName,
          targetPath: 'short_video',
          targetId: video.id,
          data: JSON.stringify({ videoId: video.id }),
        })
      }
    } catch (e) {
      console.error('[short-videos] post-processing error (non-fatal):', e)
    }
  })()

  return video
}
