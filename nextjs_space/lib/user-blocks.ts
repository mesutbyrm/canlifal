/**
 * Kullanıcı engelleme — tek kaynak `UserBlock` tablosu.
 * Engelleme iki yönlüdür: A, B'yi engellediyse ikisi birbirine mesaj atamaz,
 * birbirinin gönderisine yorum yapamaz ve akışta birbirini görmez.
 */

import prisma from '@/lib/db'

/** Görüntüleyenin engellediği veya onu engelleyen kullanıcı kimlikleri. */
export async function blockedUserIdsFor(viewerId: string | null | undefined): Promise<string[]> {
  if (!viewerId) return []
  try {
    const rows = await prisma.userBlock.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
      take: 2000,
    })
    const ids = new Set<string>()
    for (const r of rows) ids.add(r.blockerId === viewerId ? r.blockedId : r.blockerId)
    return Array.from(ids)
  } catch {
    return []
  }
}

/** İki kullanıcı arasında (herhangi bir yönde) engel var mı? */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (!a || !b || a === b) return false
  try {
    const row = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
      select: { id: true },
    })
    return !!row
  } catch {
    return false
  }
}
