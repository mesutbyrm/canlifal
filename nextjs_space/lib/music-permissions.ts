import prisma from '@/lib/db'

// Helper to check if user can control music (DJ system)
export async function canControlMusic(roomId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  const isGlobalAdmin = user?.role === 'admin' || user?.role === 'yonetici'
  
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { ownerId: true, djUserIds: true, activeDjId: true }
  })
  if (!room) return false
  const isOwner = room.ownerId === userId

  // Owner and global admins always can
  if (isGlobalAdmin || isOwner) return true

  // Check if user is a DJ
  let djUserIds: string[] = []
  try { djUserIds = room.djUserIds ? JSON.parse(room.djUserIds) : [] } catch {}
  if (!Array.isArray(djUserIds)) djUserIds = []
  
  const isDj = djUserIds.includes(userId)
  if (!isDj) return false

  // Check if owner is present
  const presences = await prisma.chatPresence.findMany({
    where: { roomId },
    select: { userId: true }
  })
  const presentUserIds = new Set(presences.map(p => p.userId))
  const ownerPresent = room.ownerId ? presentUserIds.has(room.ownerId) : false

  if (ownerPresent) {
    // Owner is present - only the activeDjId can play
    return room.activeDjId === userId
  } else {
    // Owner absent - hierarchical order (first present DJ in list)
    const presentDjs = djUserIds.filter(id => presentUserIds.has(id))
    return presentDjs.length > 0 && presentDjs[0] === userId
  }
}
