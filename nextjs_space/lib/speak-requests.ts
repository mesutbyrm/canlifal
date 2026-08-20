/**
 * Sesli oda "konuşma isteği" (el kaldırma) yardımcıları.
 *
 * Modeller: ChatSpeakRequest (istek kuyruğu) + ChatSpeakBlock (oda bazlı engel).
 * Yetki kontrolü mevcut lib/chat-permissions.ts üzerinden yapılır; yeni bir
 * yetki sistemi tanımlanmaz.
 */
import prisma from '@/lib/db'
import { getUserPermissions } from '@/lib/chat-permissions'

export interface SpeakRequestDto {
  id: string
  roomId: string
  userId: string
  userName: string
  avatar: string | null
  status: string
  message: string | null
  reason: string | null
  handledBy: string | null
  handledAt: string | null
  createdAt: string
}

/**
 * Oda sahibi / kurucu / admin / op ve üstü roller konuşma isteklerini yönetebilir.
 * "Ses yetkisi verebilen" herkes istekleri onaylayabilir/reddedebilir.
 */
export async function canModerateSpeakRequests(roomId: string, userId: string) {
  const perms = await getUserPermissions(roomId, userId)
  return {
    canHandle: perms.canGiveVoice,
    canBlock: perms.canGiveVoice,
    perms
  }
}

/** Aktif (süresi geçmemiş) engel kaydını döndürür, yoksa null. */
export async function getActiveSpeakBlock(roomId: string, userId: string) {
  const block = await prisma.chatSpeakBlock.findUnique({
    where: { roomId_userId: { roomId, userId } }
  })
  if (!block) return null
  if (block.expiresAt && block.expiresAt.getTime() <= Date.now()) {
    // Süresi dolmuş engeli temizle
    await prisma.chatSpeakBlock.delete({ where: { id: block.id } }).catch(() => {})
    return null
  }
  return block
}

export function serializeSpeakRequest(
  req: {
    id: string
    roomId: string
    userId: string
    status: string
    message: string | null
    reason: string | null
    handledBy: string | null
    handledAt: Date | null
    createdAt: Date
  },
  user?: { name: string | null; image: string | null } | null
): SpeakRequestDto {
  return {
    id: req.id,
    roomId: req.roomId,
    userId: req.userId,
    userName: user?.name || 'Kullanıcı',
    avatar: user?.image ?? null,
    status: req.status,
    message: req.message ?? null,
    reason: req.reason ?? null,
    handledBy: req.handledBy ?? null,
    handledAt: req.handledAt ? req.handledAt.toISOString() : null,
    createdAt: req.createdAt.toISOString()
  }
}

/** İstek sahibinin adı/avatarı (SSE payload'u için). */
export async function loadRequestUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, image: true }
  })
  return { userName: user?.name || 'Kullanıcı', avatar: user?.image ?? null }
}
