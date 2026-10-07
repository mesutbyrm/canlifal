import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { guardGatedRoom } from '@/lib/room-access-guard'
import { ROLE_SYMBOLS, ROLE_HIERARCHY, isUserBanned } from '@/lib/chat-permissions'
import { logActivity } from '@/lib/activity-logger'
import { triggerEventAnnouncement } from '@/lib/event-announcement'
import { getMaxUsersForRoomType } from '@/lib/voice-room-revenue'
import { emitUserJoined, emitUserLeft, emitSeatChanged, emitHostChanged } from '@/lib/voice-room-events'
import { getReceivedJetonTotals } from '@/lib/voice-room-gifts'
import { seatStaleThreshold, presenceStaleThreshold } from '@/lib/voice-room-constants'
import { resolveRoomSeatCount, findFirstFreeSeatFor, canSitOnSeat, seatKind, type SeatUserContext } from '@/lib/voice-room-seats'
import { endPksForSide } from '@/lib/pk-state'
import { closeGiftBoxesFor } from '@/lib/gift-box'
import { getUserEntitlements, meetsMinTier } from '@/lib/vip-entitlements'
import { awardVipXpSafe } from '@/lib/vip-xp'
import { authorizeVipEntry } from '@/lib/room-access'
import { welcomeUser } from '@/lib/girlive-bot'

/** Oda sahibi odadan ayrıldıysa o odaya bağlı bekleyen/aktif PK'ları kapat. */
async function endPksIfOwnerLeft(roomId: string, leavingUserId: string) {
  try {
    const room = await prisma.chatRoom.findUnique({ where: { id: roomId }, select: { ownerId: true } })
    if (room?.ownerId && room.ownerId === leavingUserId) {
      await endPksForSide([roomId], 'HOST_LEFT')
    }
  } catch (e) {
    console.error('endPksIfOwnerLeft error:', e)
  }
}

export const dynamic = 'force-dynamic'

// Auto-clean disabled — messages are only deleted manually by admins

// GET active users in a room with their roles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    // Şifreli VIP oda: katılımcı listesi yalnızca kapıdan geçmişlere açık
    {
      const gm = await authenticateRequest(request)
      const gs = !gm ? await getServerSession(authOptions) : null
      const gateDenied = await guardGatedRoom(roomId, { id: gm?.id || gs?.user?.id, role: gm?.role || (gs?.user as any)?.role })
      if (gateDenied) return gateDenied
    }
    const presenceTimeout = presenceStaleThreshold()

    // Run presences + room status in parallel
    const [presences, room] = await Promise.all([
      prisma.chatPresence.findMany({
        where: {
          roomId,
          lastSeen: { gte: presenceTimeout }
        },
        select: {
          userId: true,
          nickname: true,
          lastSeen: true,
          seatIndex: true,
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              image: true,
              level: true
            }
          }
        }
      }),
      prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { isMuted: true, seatCount: true }
      })
    ])

    // BÖLÜM 2: dinamik koltuk sayısı (istemci ızgarayı buna göre çizer)
    const getSeatCount = await resolveRoomSeatCount(roomId, (room as any)?.seatCount ?? null)

    // Get chat roles for all active users
    const userIds = presences.map((p: any) => p.userId)
    const chatRoles = await prisma.chatUserRole.findMany({
      where: {
        roomId,
        userId: { in: userIds }
      },
      select: { userId: true, role: true }
    })

    const roleMap = new Map(chatRoles.map((r: any) => [r.userId, r.role]))
    const receivedJetonMap = await getReceivedJetonTotals(roomId, userIds)

    const activeUsers = presences.map((p: any) => {
      // Global admin/moderator/site_manager gets superadmin role in chat
      const globalAdminRoles = ['admin', 'moderator', 'site_manager']
      const isGlobalAdmin = globalAdminRoles.includes(p.user.role)
      const chatRole = roleMap.get(p.user.id) || (isGlobalAdmin ? 'superadmin' : null)
      const roleSymbol = chatRole ? ROLE_SYMBOLS[chatRole as keyof typeof ROLE_SYMBOLS] || '' : ''
      const roleLevel = chatRole ? ROLE_HIERARCHY[chatRole as keyof typeof ROLE_HIERARCHY] : 0

      return {
        id: p.user.id,
        name: p.user.name,
        nickname: p.nickname || p.user.name,
        image: p.user.image || null,
        level: p.user.level ?? 1,
        lastSeen: p.lastSeen,
        chatRole,
        roleSymbol,
        roleLevel,
        isAdmin: isGlobalAdmin,
        seatIndex: p.seatIndex ?? -1,
        receivedJetons: receivedJetonMap.get(p.user.id) || 0
      }
    })

    // Sort by role level (highest first), then alphabetically
    activeUsers.sort((a: any, b: any) => {
      if (b.roleLevel !== a.roleLevel) return b.roleLevel - a.roleLevel
      return a.name.localeCompare(b.name)
    })

    console.log(`[PRESENCE] GET roomId=${roomId} activeUsers=${activeUsers.length} users=[${activeUsers.map((u: any) => u.nickname || u.name).join(', ')}]`)
    return NextResponse.json({
      users: activeUsers,
      roomMuted: room?.isMuted || false,
      seatCount: getSeatCount,
      onlineCount: activeUsers.length,
      totalCount: activeUsers.length
    })
  } catch (error) {
    console.error('Error fetching presence:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active users' },
      { status: 500 }
    )
  }
}

// Helper to check user's special role for entry announcement
async function getUserSpecialRole(roomId: string, userId: string): Promise<{ role: string | null; isSpecial: boolean; entryType: string | null; roleSymbol: string; membership: string | null }> {
  // Check if site admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true, membership: true }
  })
  
  const membership = user?.membership || null
  
  if (user?.role === 'admin') {
    return { role: 'admin', isSpecial: true, entryType: 'ADMIN', roleSymbol: '%', membership }
  }
  if (user?.role === 'yonetici') {
    return { role: 'yonetici', isSpecial: true, entryType: 'ADMIN', roleSymbol: '%', membership }
  }
  
  // Check if room owner
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { ownerId: true }
  })
  
  if (room?.ownerId === userId) {
    return { role: 'owner', isSpecial: true, entryType: 'OWNER', roleSymbol: '👑', membership }
  }
  
  // Check chat role
  const chatRole = await prisma.chatUserRole.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true }
  })
  
  if (chatRole?.role === 'superadmin') {
    return { role: 'superadmin', isSpecial: true, entryType: 'SUPERADMIN', roleSymbol: '%', membership }
  }
  if (chatRole?.role === 'founder') {
    return { role: 'founder', isSpecial: true, entryType: 'FOUNDER', roleSymbol: '~', membership }
  }
  if (chatRole?.role === 'sop' || chatRole?.role === 'admin') {
    return { role: 'sop', isSpecial: true, entryType: 'MODERATOR', roleSymbol: '&', membership }
  }
  if (chatRole?.role === 'op') {
    return { role: 'op', isSpecial: true, entryType: 'OP', roleSymbol: '@', membership }
  }
  
  // Check membership (Gold members)
  if (membership && ['diamond', 'gold', 'premium'].includes(membership)) {
    const memberLabels: Record<string, string> = {
      diamond: 'DIAMOND',
      gold: 'GOLD', 
      premium: 'PREMIUM',
    }
    return { role: null, isSpecial: true, entryType: memberLabels[membership] || null, roleSymbol: '', membership }
  }
  
  return { role: null, isSpecial: false, entryType: null, roleSymbol: '', membership }
}

// POST to update user presence (heartbeat) or remove presence (with ?_delete=1 via sendBeacon)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    // Dual auth: web session OR mobile JWT
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id
    const userName = mobileUser?.name || session?.user?.name || 'Kullanıcı'
    const userImage = mobileUser?.image || (session?.user as any)?.image || null
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      )
    }

    const { roomId } = await params
    
    console.log(`[PRESENCE] POST roomId=${roomId} userId=${userId} source=${mobileUser ? 'mobile' : 'web'}`)
    
    // Handle sendBeacon delete (page unload)
    const isDelete = request.nextUrl.searchParams.get('_delete') === '1'
    const isLeave = request.nextUrl.searchParams.get('leave') === '1'
    if (isDelete) {
      try {
        // Get nickname before clearing presence
        const presenceRecord = await prisma.chatPresence.findUnique({
          where: { roomId_userId: { roomId, userId } },
          select: { nickname: true, seatIndex: true }
        })
        // Only reset seat if explicitly leaving (not just a heartbeat cleanup)
        await prisma.chatPresence.update({
          where: { roomId_userId: { roomId, userId: userId } },
          data: { 
            lastSeen: new Date(0),
            ...(isLeave ? { seatIndex: -1 } : {})
          }
        })
        // Create leave message only on intentional leave
        if (isLeave) {
          const displayName = presenceRecord?.nickname || userName || 'Kullanıcı'
          // Deactivate any voice/mic session in this room
          await prisma.voiceSession.updateMany({
            where: { roomId, userId, isActive: true },
            data: { isActive: false }
          }).catch(() => {})
          await endPksIfOwnerLeft(roomId, userId)
          await closeGiftBoxesFor({ roomId }).catch(() => {})
          // Delete all previous leave messages, keep only the latest
          await prisma.chatMessage.deleteMany({
            where: { roomId, content: { startsWith: '[SYSTEM_LEAVE]' } }
          })
          await prisma.chatMessage.create({
            data: {
              roomId,
              userId: userId,
              content: `[SYSTEM_LEAVE]${displayName}`
            }
          })
          // Broadcast the leave (web + Flutter via SSE)
          emitUserLeft(roomId, userId, displayName)
        }
      } catch { /* ignore */ }
      return NextResponse.json({ success: true })
    }

    // Parse body for nickname, seatIndex and (optional) room password
    let nickname: string | undefined
    let seatIndex: number | undefined
    let providedPassword: string | undefined
    let providedAccessToken: string | undefined
    try {
      const body = await request.json()
      nickname = body.nickname
      if (typeof body.seatIndex === 'number') {
        seatIndex = body.seatIndex
      }
      if (typeof body.roomAccessToken === 'string') {
        providedAccessToken = body.roomAccessToken
      }
      if (typeof body.password === 'string') {
        providedPassword = body.password
      }
    } catch {
      // Body might be empty for GET-like requests
    }

    // Check if user is banned
    const banned = await isUserBanned(roomId, userId)
    if (banned) {
      return NextResponse.json({ error: 'You are banned from this room' }, { status: 403 })
    }

    // Check if this is a NEW join (not a heartbeat)
    const existingPresence = await prisma.chatPresence.findUnique({
      where: { roomId_userId: { roomId, userId: userId } }
    })

    // Enforce max user limit + password gate based on room type (only on new joins)
    const thirtySecondsAgoCheck = new Date(Date.now() - 30000)
    const isNewJoinForGate = !existingPresence || existingPresence.lastSeen < thirtySecondsAgoCheck
    if (isNewJoinForGate) {
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { roomType: true, password: true, ownerId: true, minMembershipTier: true, isVipLounge: true }
      })

      // ── BÖLÜM 20 §12/§13: VIP oda & SVIP Lounge kademe kapısı (BACKEND zorunlu) ──
      // Oda sahibi ve global yöneticiler muaftır. İstemci tarafı gizleme YETERLİ DEĞİLDİR.
      if (room?.minMembershipTier || room?.isVipLounge) {
        let tierBypass = room?.ownerId === userId
        if (!tierBypass) {
          const cu = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
          tierBypass = ['admin', 'yonetici', 'moderator', 'site_manager'].includes(cu?.role || '')
        }
        if (!tierBypass) {
          const ent = await getUserEntitlements(userId)
          if (room.isVipLounge && !ent.features['vip.vip_lounge']?.enabled) {
            return NextResponse.json(
              { error: 'Bu alan yalnızca SVIP üyelere açıktır', code: 'VIP_LOUNGE_REQUIRED' },
              { status: 403 }
            )
          }
          if (room.minMembershipTier && !(await meetsMinTier(userId, room.minMembershipTier))) {
            return NextResponse.json(
              {
                error: 'Bu odaya girmek için daha yüksek bir üyelik kademesi gerekiyor',
                code: 'MEMBERSHIP_TIER_REQUIRED',
                requiredTier: room.minMembershipTier,
              },
              { status: 403 }
            )
          }
        }
      }

      // ── Şifre kapısı: YALNIZCA VIP oda (lib/room-access.ts) ──
      // Doğrulama sunucuda; en fazla 3 deneme; sahip/yönetici muaf; oda sahibinin
      // verdiği giriş izni veya verify-password'ün imzalı jetonu da kabul edilir.
      const roomType = room?.roomType || 'FREE'
      if (room) {
        const authUserRole = (await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role
        const decision = await authorizeVipEntry({
          room: { id: roomId, roomType: room.roomType, password: room.password, ownerId: room.ownerId },
          userId,
          globalRole: authUserRole,
          password: providedPassword,
          accessToken: providedAccessToken,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        })
        if (!decision.ok) {
          return NextResponse.json(
            {
              error: decision.message,
              code: decision.code,
              remainingAttempts: decision.remainingAttempts,
              locked: decision.locked,
            },
            { status: decision.status }
          )
        }
      }

      const maxUsers = await getMaxUsersForRoomType(roomType)
      const presenceTimeout = presenceStaleThreshold()
      const activeCount = await prisma.chatPresence.count({
        where: { roomId, lastSeen: { gte: presenceTimeout } }
      })
      if (activeCount >= maxUsers) {
        return NextResponse.json({ error: `Bu oda dolu. Maksimum ${maxUsers} kişi.` }, { status: 403 })
      }
    }
    
    const thirtySecondsAgo = new Date(Date.now() - 30000)
    const isNewJoin = !existingPresence || existingPresence.lastSeen < thirtySecondsAgo

    // ── Auto-seat on NEW join ──
    // When a permitted user joins and did not explicitly request a seat, place
    // them on the first free seat (0..SEAT_COUNT-1). If the room is full of
    // seated users they stay a listener (seatIndex -1). Heartbeats never trigger
    // this because seatIndex stays undefined and isNewJoin is false.
    // ── BÖLÜM 2: odanın etkin koltuk sayısı + kullanıcının koltuk yetkisi ──
    const roomForSeats = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { seatCount: true, ownerId: true }
    })
    const roomSeatCount = await resolveRoomSeatCount(roomId, roomForSeats?.seatCount ?? null)
    const [seatUserRow, seatChatRole] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { role: true, membership: true } }),
      prisma.chatUserRole.findUnique({
        where: { roomId_userId: { roomId, userId } },
        select: { role: true }
      }).catch(() => null)
    ])
    const seatCtx: SeatUserContext = {
      userId,
      role: seatUserRow?.role ?? null,
      membership: seatUserRow?.membership ?? null,
      isRoomOwner: roomForSeats?.ownerId === userId,
      chatRole: seatChatRole?.role ?? null
    }

    // Kademe kuralı: kullanıcı istediği koltuğa oturamıyorsa dinleyici kalır.
    if (typeof seatIndex === 'number' && seatIndex >= 0 && !canSitOnSeat(seatCtx, seatIndex, roomSeatCount)) {
      seatIndex = -1
    }

    if (isNewJoin && seatIndex === undefined) {
      // Use the short seat-stale window so seats freed by users who left
      // (ghosts) are re-assignable immediately.
      const seated = await prisma.chatPresence.findMany({
        where: { roomId, lastSeen: { gte: seatStaleThreshold() }, seatIndex: { gte: 0, lt: roomSeatCount }, userId: { not: userId } },
        select: { seatIndex: true }
      })
      const freeSeat = findFirstFreeSeatFor(seatCtx, seated.map((s) => s.seatIndex as number), roomSeatCount)
      if (freeSeat >= 0) {
        seatIndex = freeSeat
      }
    }
    
    // Faz 20 — §78 Race Condition: koltuk kontrolü + upsert tek bir interactive
    // transaction içinde. İki istek aynı koltuğa aynı anda ulaşırsa ikincisi
    // serialization hatası alır ve listener olarak kalır (seatIndex = -1).
    let seatConflict = false
    try {
      await prisma.$transaction(async (tx: any) => {
        if (seatIndex !== undefined && seatIndex >= 0 && seatIndex < roomSeatCount) {
          const seatTaken = await tx.chatPresence.findFirst({
            where: {
              roomId,
              seatIndex,
              lastSeen: { gte: seatStaleThreshold() },
              userId: { not: userId }
            }
          })
          if (seatTaken) {
            seatConflict = true
            seatIndex = -1 // çakışma — dinleyici olarak otur
          }
        }

        await tx.chatPresence.upsert({
          where: {
            roomId_userId: {
              roomId,
              userId: userId
            }
          },
          update: {
            lastSeen: new Date(),
            ...(nickname ? { nickname } : {}),
            ...(seatIndex !== undefined ? { seatIndex } : {})
          },
          create: {
            roomId,
            userId: userId,
            ...(nickname ? { nickname } : {}),
            seatIndex: seatIndex !== undefined ? seatIndex : -1
          }
        })
      }, { isolationLevel: 'ReadCommitted' })
    } catch (txError: unknown) {
      // P2002 unique constraint — eski geri dönüş davranışı
      if ((txError as { code?: string })?.code === 'P2002') {
        await prisma.chatPresence.update({
          where: {
            roomId_userId: {
              roomId,
              userId: userId
            }
          },
          data: {
            lastSeen: new Date(),
            ...(nickname ? { nickname } : {}),
            ...(seatIndex !== undefined ? { seatIndex } : {})
          }
        })
      } else {
        throw txError
      }
    }
    if (seatConflict) {
      // Koltuk doluydu, dinleyici olarak katıldı — hata dönmek yerine devam et;
      // istemci presence yanıtından seatIndex=-1 görüp uygun UI gösterir.
    }
    
    // GHOST PREVENTION: on a NEW join, force-leave any OTHER room this user is
    // still marked present in (single presence). Also deactivate any voice/mic
    // sessions elsewhere so a user can never occupy two rooms at once. This is
    // shared by web AND Flutter since both hit this endpoint.
    if (isNewJoin) {
      try {
        await prisma.chatPresence.updateMany({
          where: { userId, roomId: { not: roomId }, lastSeen: { gte: presenceStaleThreshold() } },
          data: { lastSeen: new Date(0), seatIndex: -1 }
        })
        await prisma.voiceSession.updateMany({
          where: { userId, roomId: { not: roomId }, isActive: true },
          data: { isActive: false }
        })
      } catch (e) {
        console.error('[PRESENCE] ghost-cleanup failed', e)
      }
      // Broadcast the join to everyone in this room (web + Flutter via SSE)
      emitUserJoined(roomId, userId, nickname || userName || 'Kullanıcı', userImage)
      // GirLive Bot hoş geldin (30 dk içinde aynı kullanıcıya tekrar yazmaz)
      void welcomeUser('voice_room', roomId, userId)
      if (typeof seatIndex === 'number' && seatIndex >= 0) {
        emitSeatChanged(roomId, userId, seatIndex, -1, {
          seatKind: seatKind(seatIndex, roomSeatCount),
          seatCount: roomSeatCount,
          name: nickname || userName || 'Kullanıcı'
        })
        if (seatIndex === 0) {
          emitHostChanged(roomId, userId, true, nickname || userName || 'Kullanıcı')
        }
      }
    }

    // BÖLÜM 20 §18 — Sesli odaya katılım VIP sezon puanı (jeton ekonomisinden BAĞIMSIZ).
    // Ateşle-unut: hata durumunda oda girişini asla etkilemez.
    if (isNewJoin) {
      awardVipXpSafe({
        userId,
        source: 'voice_room',
        refId: `room:${roomId}:${new Date().toISOString().slice(0, 10)}`,
        note: 'Sesli odaya katılım',
      })
    }

    // Log chat join activity (only on new joins)
    if (isNewJoin) {
      logActivity({
        userId: userId,
        userName: nickname || userName || 'Kullanıcı',
        userAvatar: userImage || null,
        activityType: 'chat_join',
        detail: 'sohbete katıldı 💬',
        targetUrl: `/sohbet`,
      })
      // Trigger voice room join event announcement
      const joinUserName = nickname || userName || 'Bir kullanıcı'
      prisma.chatRoom.findUnique({ where: { id: roomId }, select: { nameTr: true } }).then(r => {
        const roomName = r?.nameTr || 'Sesli Oda'
        triggerEventAnnouncement('voice_room_join', { user: joinUserName, room: roomName }, userId, joinUserName, mobileUser?.role || 'free' || 'free').catch(() => {})
      }).catch(() => {})
    }

    // If new join, create a system message (but only once per 5 minutes)
    if (isNewJoin) {
      // Check if we already announced this user's entry in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const recentJoinMessage = await prisma.chatMessage.findFirst({
        where: {
          roomId,
          userId: userId,
          content: { startsWith: '[SYSTEM_' },
          createdAt: { gte: fiveMinutesAgo }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      // Only create join message if no recent announcement exists
      if (!recentJoinMessage) {
        const displayName = nickname || userName || 'Kullanıcı'
        const specialRole = await getUserSpecialRole(roomId, userId)
        
        // Delete ALL previous join messages in this room (keep only the latest one)
        await prisma.chatMessage.deleteMany({
          where: {
            roomId,
            OR: [
              { content: { startsWith: '[SYSTEM_JOIN]' } },
              { content: { startsWith: '[SYSTEM_VIP_JOIN' } }
            ]
          }
        })
        
        // Create entry system message with roleSymbol prefix
        const prefixedName = specialRole.roleSymbol ? `${specialRole.roleSymbol}${displayName}` : displayName
        let systemContent = `[SYSTEM_JOIN]${displayName}`
        if (specialRole.isSpecial && specialRole.entryType) {
          systemContent = `[SYSTEM_VIP_JOIN:${specialRole.entryType}]${prefixedName}`
        }
        
        await prisma.chatMessage.create({
          data: {
            roomId,
            userId: userId,
            content: systemContent
          }
        })
      }
    }

    // Return updated active users
    const presenceTimeout = presenceStaleThreshold()
    const [presences, room] = await Promise.all([
      prisma.chatPresence.findMany({
        where: {
          roomId,
          lastSeen: { gte: presenceTimeout }
        },
        select: {
          userId: true,
          nickname: true,
          lastSeen: true,
          seatIndex: true,
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              image: true,
              level: true
            }
          }
        }
      }),
      prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { isMuted: true }
      })
    ])

    // Get chat roles for all active users
    const userIds = presences.map((p: any) => p.userId)
    const chatRoles = await prisma.chatUserRole.findMany({
      where: {
        roomId,
        userId: { in: userIds }
      },
      select: { userId: true, role: true }
    })

    const roleMap = new Map(chatRoles.map((r: any) => [r.userId, r.role])
    )

    const activeUsers = presences.map((p: any) => {
      const globalAdminRoles2 = ['admin', 'moderator', 'site_manager']
      const isGlobalAdmin2 = globalAdminRoles2.includes(p.user.role)
      const chatRole = roleMap.get(p.user.id) || (isGlobalAdmin2 ? 'superadmin' : null)
      const roleSymbol = chatRole ? ROLE_SYMBOLS[chatRole as keyof typeof ROLE_SYMBOLS] || '' : ''
      const roleLevel = chatRole ? ROLE_HIERARCHY[chatRole as keyof typeof ROLE_HIERARCHY] : 0

      return {
        id: p.user.id,
        name: p.user.name,
        nickname: p.nickname || p.user.name,
        image: p.user.image || null,
        level: p.user.level ?? 1,
        lastSeen: p.lastSeen,
        chatRole,
        roleSymbol,
        roleLevel,
        isAdmin: isGlobalAdmin2,
        seatIndex: p.seatIndex ?? -1
      }
    })

    // Sort by role level (highest first), then alphabetically by nickname
    activeUsers.sort((a: any, b: any) => {
      if (b.roleLevel !== a.roleLevel) return b.roleLevel - a.roleLevel
      return (a.nickname || a.name).localeCompare(b.nickname || b.name)
    })

    return NextResponse.json({
      users: activeUsers,
      roomMuted: room?.isMuted || false,
      seatCount: roomSeatCount,
      onlineCount: activeUsers.length,
      totalCount: activeUsers.length
    })
  } catch (error) {
    console.error('Error updating presence:', error)
    return NextResponse.json(
      { error: 'Failed to update presence' },
      { status: 500 }
    )
  }
}


// DELETE to remove user presence (when leaving room)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    // Dual auth: web session OR mobile JWT
    const mobileUserDel = await authenticateRequest(request)
    const sessionDel = !mobileUserDel ? await getServerSession(authOptions) : null
    const delUserId = mobileUserDel?.id || sessionDel?.user?.id
    const delUserName = mobileUserDel?.name || sessionDel?.user?.name || 'Kullanıcı'
    
    if (!delUserId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    
    // Check if this is an intentional leave (via query param from sendBeacon)
    const isIntentionalLeave = request.nextUrl.searchParams.get('leave') === '1'

    // Get the user's nickname before removing presence
    const presence = await prisma.chatPresence.findUnique({
      where: { roomId_userId: { roomId, userId: delUserId } },
      select: { nickname: true }
    })
    
    const displayName = presence?.nickname || delUserName || 'Kullanıcı'

    // Set lastSeen to past so user disappears from active list immediately
    // Only reset seat if this is an intentional leave
    try {
      await prisma.chatPresence.update({
        where: {
          roomId_userId: {
            roomId,
            userId: delUserId
          }
        },
        data: {
          lastSeen: new Date(0), // epoch - effectively removes from active list
          ...(isIntentionalLeave ? { seatIndex: -1 } : {})
        }
      })
    } catch {
      // Presence record might not exist
    }
    
    // Only create exit message if this is an intentional leave (page close/navigate away)
    if (isIntentionalLeave) {
      // Deactivate any voice/mic session in this room
      await prisma.voiceSession.updateMany({
        where: { roomId, userId: delUserId, isActive: true },
        data: { isActive: false }
      }).catch(() => {})
      await endPksIfOwnerLeft(roomId, delUserId)
      await closeGiftBoxesFor({ roomId }).catch(() => {})
      // Delete all previous leave messages, keep only the latest
      await prisma.chatMessage.deleteMany({
        where: { roomId, content: { startsWith: '[SYSTEM_LEAVE]' } }
      })
      await prisma.chatMessage.create({
        data: {
          roomId,
          userId: delUserId,
          content: `[SYSTEM_LEAVE]${displayName}`
        }
      })
      // Broadcast the leave (web + Flutter via SSE)
      emitUserLeft(roomId, delUserId, displayName)
    }
    
    let onlineCount = 0
    try {
      onlineCount = await prisma.chatPresence.count({
        where: { roomId, lastSeen: { gte: presenceStaleThreshold() } }
      })
    } catch {}

    return NextResponse.json({ success: true, onlineCount, totalCount: onlineCount })
  } catch (error) {
    console.error('Error removing presence:', error)
    return NextResponse.json({ error: 'Failed to remove presence' }, { status: 500 })
  }
}