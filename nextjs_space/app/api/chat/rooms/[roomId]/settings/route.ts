import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { getUserPermissions, ROLE_HIERARCHY } from '@/lib/chat-permissions'

export const dynamic = 'force-dynamic'

// GET room settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const permissions = await getUserPermissions(roomId, session.user.id)

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
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({ room, myPermissions: permissions })
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
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const permissions = await getUserPermissions(roomId, session.user.id)

    // Only founders+ and room owners can update settings
    if (!permissions.canManageRoom && !permissions.isGlobalAdmin) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const body = await request.json()
    const {
      nameTr, nameEn, descTr, descEn, icon,
      isMuted, isActive,
      giftCommissionPercent, backgroundImage, bannedWords
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
      }
    })

    return NextResponse.json({ success: true, room: updated })
  } catch (error) {
    console.error('Error updating room settings:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
