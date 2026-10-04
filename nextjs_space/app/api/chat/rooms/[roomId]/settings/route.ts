import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { getUserPermissions, ROLE_HIERARCHY } from '@/lib/chat-permissions'
import { clampSeatCount } from '@/lib/voice-room-seats'
import { hashRoomPassword, resetPasswordAttempts, invalidateChatRoomCache } from '@/lib/room-access'
import { recordAudit } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

// GET room settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const permissions = await getUserPermissions(roomId, authUser.id)

    // Only founders+ and room owners can view settings
    if (!permissions.canManageRoom && !permissions.isGlobalAdmin) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameTr: true,
        descEn: true,
        descTr: true,
        icon: true,
        isActive: true,
        isMuted: true,
        ownerId: true,
        owner: { select: { id: true, name: true, username: true } },
        giftCommissionPercent: true,
        giftBeneficiaryId: true,
        giftBeneficiary: { select: { id: true, name: true, username: true } },
        backgroundImage: true,
        bannedWords: true,
        djUserIds: true,
        activeDjId: true,
        whitelistedWords: true,
        roomType: true,
        password: true,
        welcomeMessage: true,
        pinnedAnnouncement: true,
        tags: true,
        seatCount: true,
        bannerImage: true,
        autoModeration: true,
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    }

    const { password: storedPassword, ...roomSafe } = room as typeof room & { password?: string | null }
    return NextResponse.json({
      room: { ...roomSafe, hasPassword: !!storedPassword },
      myPermissions: permissions,
    })
  } catch (error) {
    console.error('Error fetching room settings:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// PATCH update room settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const permissions = await getUserPermissions(roomId, authUser.id)

    // Only founders+ and room owners can update settings
    if (!permissions.canManageRoom && !permissions.isGlobalAdmin) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const body = await request.json()
    const {
      nameTr, nameEn, descTr, descEn, icon,
      isMuted, isActive,
      giftCommissionPercent, backgroundImage, bannedWords,
      roomType, password: roomPassword, welcomeMessage,
      pinnedAnnouncement, tags, bannerImage
    } = body

    const updateData: Record<string, any> = {}

    // Room name/desc - founders and superadmins can change
    if (nameTr !== undefined) updateData.nameTr = nameTr
    if (nameEn !== undefined) updateData.nameEn = nameEn
    if (descTr !== undefined) updateData.descTr = descTr
    if (descEn !== undefined) updateData.descEn = descEn
    if (icon !== undefined) updateData.icon = icon
    if (typeof isMuted === 'boolean') updateData.isMuted = isMuted
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (backgroundImage !== undefined) updateData.backgroundImage = backgroundImage || null
    if (bannedWords !== undefined) updateData.bannedWords = bannedWords || null
    if (body.whitelistedWords !== undefined) updateData.whitelistedWords = body.whitelistedWords || null
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage || null
    if (pinnedAnnouncement !== undefined) updateData.pinnedAnnouncement = pinnedAnnouncement || null
    if (tags !== undefined) updateData.tags = tags || null
    // BÖLÜM 2 — oda bazlı koltuk sayısı: null gönderilirse global varsayılana döner
    if (body.seatCount !== undefined) {
      updateData.seatCount =
        body.seatCount === null || body.seatCount === ''
          ? null
          : clampSeatCount(body.seatCount)
    }
    if (bannerImage !== undefined) updateData.bannerImage = bannerImage || null
    // GirLive Bot otomatik moderasyon: oda sahibi/yönetici açıp kapatabilir
    if (typeof body.autoModeration === 'boolean') updateData.autoModeration = body.autoModeration
    // Şifre YALNIZCA VIP odalarda tanımlanabilir; saklanan değer bcrypt hash'idir.
    // Kaldırma (boş değer) her oda türünde serbesttir (eski kayıtları temizlemek için).
    let passwordChanged = false
    if (roomPassword !== undefined) {
      const newPlain = typeof roomPassword === 'string' ? roomPassword.trim() : ''
      if (newPlain) {
        const current = await prisma.chatRoom.findUnique({ where: { id: roomId }, select: { roomType: true } })
        const effectiveType = (roomType !== undefined && permissions.isGlobalAdmin ? roomType : current?.roomType) || 'FREE'
        if (effectiveType !== 'VIP') {
          return NextResponse.json(
            { error: 'Oda şifresi yalnızca VIP odalarda kullanılabilir', code: 'PASSWORD_VIP_ONLY' },
            { status: 400 }
          )
        }
        if (newPlain.length < 4 || newPlain.length > 64) {
          return NextResponse.json({ error: 'Şifre 4-64 karakter olmalıdır', code: 'PASSWORD_LENGTH' }, { status: 400 })
        }
        updateData.password = await hashRoomPassword(newPlain)
      } else {
        updateData.password = null
      }
      passwordChanged = true
    }

    // Room type - only global admin can change
    if (roomType !== undefined && permissions.isGlobalAdmin) {
      const validTypes = ['FREE', 'NORMAL', 'VIP']
      if (validTypes.includes(roomType)) {
        updateData.roomType = roomType
      }
    }

    // Commission - only global admin (superadmin) can set
    if (giftCommissionPercent !== undefined && permissions.isGlobalAdmin) {
      const pct = Math.max(0, Math.min(100, parseInt(giftCommissionPercent) || 0))
      updateData.giftCommissionPercent = pct
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek bir şey yok' }, { status: 400 })
    }

    const updated = await prisma.chatRoom.update({
      where: { id: roomId },
      data: updateData,
      select: {
        id: true,
        slug: true,
        nameTr: true,
        nameEn: true,
        descTr: true,
        descEn: true,
        icon: true,
        isActive: true,
        isMuted: true,
        giftCommissionPercent: true,
        backgroundImage: true,
        bannedWords: true,
        djUserIds: true,
        activeDjId: true,
        whitelistedWords: true,
        roomType: true,
        password: true,
        welcomeMessage: true,
        pinnedAnnouncement: true,
        tags: true,
        seatCount: true,
        bannerImage: true,
        autoModeration: true,
      }
    })

    if (passwordChanged) {
      invalidateChatRoomCache({ id: roomId, slug: (updated as any).slug })
      await resetPasswordAttempts(roomId)
      await recordAudit({
        actorId: authUser.id,
        action: updateData.password ? 'room_password_set' : 'room_password_remove',
        targetType: 'ChatRoom',
        targetId: roomId,
        description: updateData.password ? 'VIP oda şifresi ayarlandı' : 'VIP oda şifresi kaldırıldı',
      })
    }
    const { password: updatedPassword, ...updatedSafe } = updated as typeof updated & { password?: string | null }
    return NextResponse.json({ success: true, room: { ...updatedSafe, hasPassword: !!updatedPassword } })
  } catch (error) {
    console.error('Error updating room settings:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
