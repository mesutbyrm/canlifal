import prisma from '@/lib/db'

// Role hierarchy: % (admin/en güçlü) > ~ (founder) > & (sop) > @ (op) > +v (voice)
export const ROLE_HIERARCHY = {
  superadmin: 5,  // % - Site yöneticileri, en güçlü yetki
  founder: 4,     // ~ - Oda kurucusu
  sop: 3,         // & - Süper operatör
  op: 2,          // @ - Operatör
  voice: 1,       // +v - Ses yetkisi
  none: 0
} as const

export const ROLE_SYMBOLS: Record<string, string> = {
  superadmin: '%',
  founder: '~',
  sop: '&',
  op: '@',
  voice: '+'
}

export const ROLE_LABELS: Record<string, string> = {
  superadmin: '%Admin',
  founder: '~Kurucu',
  sop: '&SOP',
  op: '@Operatör',
  voice: '+Ses'
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
  canGiveSop: boolean
  canGiveFounder: boolean
  canManageRoom: boolean
  canSpeakInMutedRoom: boolean
  isGlobalAdmin: boolean
  isRoomOwner: boolean
}

export async function getUserRole(roomId: string, userId: string): Promise<ChatRole> {
  // Check if user is global admin, moderator or site_manager → auto % superadmin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  const staffRoles = ['admin', 'moderator', 'site_manager']
  if (user?.role && staffRoles.includes(user.role)) {
    return 'superadmin' // Staff gets % (en güçlü yetki) in all rooms
  }

  // Check if user is room owner → ~ founder
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { ownerId: true }
  })

  if (room?.ownerId === userId) {
    return 'founder' // Room owner gets ~ founder
  }

  const userRole = await prisma.chatUserRole.findUnique({
    where: {
      roomId_userId: { roomId, userId }
    }
  })

  // Backward compat: old "admin" role maps to "sop"
  const role = userRole?.role
  if (role === 'admin') return 'sop'
  return (role as ChatRole) || 'none'
}

export async function getUserPermissions(roomId: string, userId: string): Promise<UserPermissions> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  const staffRoles2 = ['admin', 'moderator', 'site_manager']
  const isGlobalAdmin = user?.role ? staffRoles2.includes(user.role) : false
  
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
    // @ op ve üstü susturabilir
    canMuteUsers: isRoomOwner || roleLevel >= ROLE_HIERARCHY.op,
    // & sop ve üstü atabilir
    canKickUsers: isRoomOwner || roleLevel >= ROLE_HIERARCHY.sop,
    // & sop ve üstü banlayabilir
    canBanUsers: isRoomOwner || roleLevel >= ROLE_HIERARCHY.sop,
    // & sop ve üstü odayı sessize alabilir
    canMuteRoom: isRoomOwner || roleLevel >= ROLE_HIERARCHY.sop,
    // @ op ve üstü ses yetkisi verebilir
    canGiveVoice: isRoomOwner || roleLevel >= ROLE_HIERARCHY.op,
    // ~ founder ve üstü op verebilir
    canGiveOp: isRoomOwner || roleLevel >= ROLE_HIERARCHY.founder,
    // ~ founder ve üstü sop verebilir
    canGiveSop: isRoomOwner || roleLevel >= ROLE_HIERARCHY.founder,
    // Sadece % superadmin founder verebilir
    canGiveFounder: isGlobalAdmin,
    // ~ founder ve üstü oda ayarlarına erişebilir
    canManageRoom: isRoomOwner || roleLevel >= ROLE_HIERARCHY.founder,
    // +v voice ve üstü sessiz odada konuşabilir
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
