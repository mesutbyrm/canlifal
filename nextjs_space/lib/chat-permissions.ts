import prisma from '@/lib/db'

// Role hierarchy: founder (~) > admin (&) > op (@) > voice (+)
export const ROLE_HIERARCHY = {
  founder: 4,  // ~
  admin: 3,    // &
  op: 2,       // @
  voice: 1,    // +
  none: 0
} as const

export const ROLE_SYMBOLS: Record<string, string> = {
  founder: '~',
  admin: '&',
  op: '@',
  voice: '+'
}

export type ChatRole = keyof typeof ROLE_HIERARCHY

export interface UserPermissions {
  role: ChatRole
  canMuteUsers: boolean
  canKickUsers: boolean
  canBanUsers: boolean
  canMuteRoom: boolean
  canGiveVoice: boolean
  canGiveOp: boolean
  canGiveAdmin: boolean
  canGiveFounder: boolean
  canSpeakInMutedRoom: boolean
  isGlobalAdmin: boolean
  isRoomOwner: boolean
}

export async function getUserRole(roomId: string, userId: string): Promise<ChatRole> {
  // Check if user is global admin, moderator or site_manager
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  const staffRoles = ['admin', 'moderator', 'site_manager']
  if (user?.role && staffRoles.includes(user.role)) {
    return 'founder' // Staff has founder rights in all rooms
  }

  // Check if user is room owner - room owners have founder rights
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { ownerId: true }
  })

  if (room?.ownerId === userId) {
    return 'founder' // Room owner has founder rights in their room
  }

  const userRole = await prisma.chatUserRole.findUnique({
    where: {
      roomId_userId: { roomId, userId }
    }
  })

  return (userRole?.role as ChatRole) || 'none'
}

export async function getUserPermissions(roomId: string, userId: string): Promise<UserPermissions> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  const staffRoles2 = ['admin', 'moderator', 'site_manager']
  const isGlobalAdmin = user?.role ? staffRoles2.includes(user.role) : false
  
  // Check if user is room owner
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { ownerId: true }
  })
  const isRoomOwner = room?.ownerId === userId
  
  const role = await getUserRole(roomId, userId)
  const roleLevel = ROLE_HIERARCHY[role]

  return {
    role,
    isGlobalAdmin,
    isRoomOwner,
    // @ and above can mute users (room owner always can)
    canMuteUsers: isRoomOwner || roleLevel >= ROLE_HIERARCHY.op,
    // ~ can kick users (room owner always can)
    canKickUsers: isRoomOwner || roleLevel >= ROLE_HIERARCHY.founder,
    // & and above can ban users (room owner always can)
    canBanUsers: isRoomOwner || roleLevel >= ROLE_HIERARCHY.admin,
    // & and above can mute the room (room owner always can)
    canMuteRoom: isRoomOwner || roleLevel >= ROLE_HIERARCHY.admin,
    // ~ can give voice when room is muted (room owner always can)
    canGiveVoice: isRoomOwner || roleLevel >= ROLE_HIERARCHY.founder,
    // ~ can give op (room owner always can)
    canGiveOp: isRoomOwner || roleLevel >= ROLE_HIERARCHY.founder,
    // ~ can give admin (room owner always can)
    canGiveAdmin: isRoomOwner || roleLevel >= ROLE_HIERARCHY.founder,
    // Only global admin can give founder
    canGiveFounder: isGlobalAdmin,
    // + and above can speak in muted room (room owner always can)
    canSpeakInMutedRoom: isRoomOwner || roleLevel >= ROLE_HIERARCHY.voice
  }
}

export async function canUserSpeak(roomId: string, userId: string): Promise<{ canSpeak: boolean; reason?: string }> {
  // Check if user is banned
  const ban = await prisma.chatBan.findUnique({
    where: {
      roomId_userId: { roomId, userId }
    }
  })

  if (ban) {
    if (!ban.expiresAt || ban.expiresAt > new Date()) {
      return { canSpeak: false, reason: 'banned' }
    }
    // Ban expired, remove it
    await prisma.chatBan.delete({ where: { id: ban.id } })
  }

  // Check if user is muted
  const mute = await prisma.chatMute.findUnique({
    where: {
      roomId_userId: { roomId, userId }
    }
  })

  if (mute) {
    if (!mute.expiresAt || mute.expiresAt > new Date()) {
      return { canSpeak: false, reason: 'muted' }
    }
    // Mute expired, remove it
    await prisma.chatMute.delete({ where: { id: mute.id } })
  }

  // Check if room is muted
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { isMuted: true }
  })

  if (room?.isMuted) {
    const permissions = await getUserPermissions(roomId, userId)
    if (!permissions.canSpeakInMutedRoom) {
      return { canSpeak: false, reason: 'room_muted' }
    }
  }

  return { canSpeak: true }
}

export async function isUserBanned(roomId: string, userId: string): Promise<boolean> {
  const ban = await prisma.chatBan.findUnique({
    where: {
      roomId_userId: { roomId, userId }
    }
  })

  if (ban) {
    if (!ban.expiresAt || ban.expiresAt > new Date()) {
      return true
    }
    // Ban expired, remove it
    await prisma.chatBan.delete({ where: { id: ban.id } })
  }

  return false
}
