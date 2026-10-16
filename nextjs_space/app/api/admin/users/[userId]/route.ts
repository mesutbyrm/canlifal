import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { staffCan } from '@/lib/permissions'
import { isFullAdmin } from '@/lib/admin-utils'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { finalizeStreamEnd } from '@/lib/video-stream-end'

// GET - Fetch single user details
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getStaffSession()
  if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'moderation.user.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        phone: true,
        image: true,
        preferredLanguage: true,
        credits: true,
        jetonBalance: true,
        role: true,
        membership: true,
        membershipExpiresAt: true,
        createdAt: true,
        birthDate: true,
        birthTime: true,
        zodiacSign: true,
        risingSign: true,
        referralCode: true,
        referralCreditsEarned: true,
        specialBadges: true,
        profileEffect: true,
        _count: {
          select: {
            fortunes: true,
            liveSessions: true,
            videoStreams: true,
            chatMessages: true,
            socialPosts: true,
          }
        },
        fortuneTellerProfile: {
          select: {
            id: true,
            displayName: true,
            isOnline: true,
            approvedAt: true,
          }
        },
        bannedIn: {
          select: {
            id: true,
            roomId: true,
            reason: true,
            createdAt: true,
          }
        },
        videoStreams: {
          where: { status: 'active' },
          select: { id: true, title: true, viewerCount: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Check if user is banned from live streaming
    const streamBan = await prisma.platformSettings.findFirst({
      where: { key: `stream_ban_${params.userId}` }
    })

    return NextResponse.json({
      ...user,
      isStreamBanned: !!streamBan,
      streamBanReason: streamBan?.value || null
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

// PATCH - Update user details
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getStaffSession()
  if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'moderation.user.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { 
      action,
      name,
      email,
      username,
      phone,
      image,
      credits,
      role,
      membership,
      membershipExpiresAt,
      newPassword,
      banReason,
      streamBanReason,
      specialBadges,
      profileEffect,
    } = body

    // ── Yetki sınırları ──────────────────────────────────────────────
    // Bu uca «kullanıcı görme» yetkisiyle (moderatör, finans) girilebiliyor;
    // önceden aynı yetkiyle rol değiştirme (kendini admin yapma dahil),
    // herkesin şifresini sıfırlama ve kayıtsız jeton/CFC işlemi yapılabiliyordu.
    const actorRole = String((session.user as any).role || '')
    const actorId = String((session.user as any).id || '')
    const actorFull = isFullAdmin(actorRole)
    const target = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { role: true, credits: true, jetonBalance: true },
    })
    if (!target) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }
    const deny = (msg: string) => NextResponse.json({ error: msg }, { status: 403 })
    // Üst yetkili hesaplar (admin / yönetici / kurucu) yalnız tam admin tarafından düzenlenir.
    if (isFullAdmin(target.role) && !actorFull) {
      return deny('Yönetici hesapları üzerinde işlem yetkiniz yok')
    }
    const CREDIT_ACTIONS = ['add_credits', 'remove_credits', 'set_credits', 'add_jetons', 'remove_jetons', 'set_jetons']
    if (action === 'reset_password') {
      if (!actorFull) return deny('Şifre sıfırlama yalnız tam yöneticilere açıktır')
      if (target.role === 'kurucu' && actorRole !== 'kurucu') return deny('Kurucu hesabının şifresi değiştirilemez')
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return NextResponse.json({ error: 'Şifre en az 8 karakter olmalı' }, { status: 400 })
      }
    }
    if (CREDIT_ACTIONS.includes(action)) {
      if (!(await staffCan(actorRole, actorId, 'finance.jeton.adjust', ['admin', 'yonetici', 'kurucu', 'finans']))) {
        return deny('Bakiye işlemi yetkiniz yok')
      }
      const n = Math.abs(Number(action.endsWith('_credits') && action !== 'set_credits' ? credits : body.amount) || 0)
      if (action === 'remove_credits' && n > (target.credits ?? 0)) {
        return NextResponse.json({ error: `Yetersiz bakiye: ${target.credits ?? 0} CFC` }, { status: 400 })
      }
      if (action === 'remove_jetons' && n > (target.jetonBalance ?? 0)) {
        return NextResponse.json({ error: `Yetersiz bakiye: ${target.jetonBalance ?? 0} jeton` }, { status: 400 })
      }
    }
    if (role !== undefined) {
      if (!actorFull) return deny('Rol değiştirme yalnız tam yöneticilere açıktır')
      if (params.userId === actorId) return deny('Kendi rolünüzü değiştiremezsiniz')
      if ((role === 'kurucu' || target.role === 'kurucu') && actorRole !== 'kurucu') {
        return deny('Kurucu rolünü yalnız kurucu değiştirebilir')
      }
    }
    if ((membership !== undefined || membershipExpiresAt !== undefined) && !actorFull && actorRole !== 'finans') {
      return deny('Üyelik değiştirme yetkiniz yok')
    }
    if (action === 'reset_password' || CREDIT_ACTIONS.includes(action) || role !== undefined) {
      recordAudit({
        actorId,
        actorRole,
        action: action === 'reset_password' ? 'user_password_reset' : role !== undefined && !action ? 'user_role_change' : 'balance_adjust',
        targetType: 'User',
        targetId: params.userId,
        before: { role: target.role, credits: target.credits, jetonBalance: target.jetonBalance },
        after: { action: action || null, role: role ?? null, credits: credits ?? null, amount: body.amount ?? null },
        description: `Admin kullanıcı işlemi: ${action || 'rol'}`,
        ip: getAuditIp(request),
      }).catch(() => {})
    }

    // Handle specific actions
    if (action === 'reset_password') {
      const hashedPassword = await bcrypt.hash(newPassword, 12)
      await prisma.user.update({
        where: { id: params.userId },
        data: { password: hashedPassword }
      })
      return NextResponse.json({ success: true, message: 'Password reset successfully' })
    }

    if (action === 'ban_stream') {
      await prisma.platformSettings.upsert({
        where: { key: `stream_ban_${params.userId}` },
        create: {
          key: `stream_ban_${params.userId}`,
          value: streamBanReason || 'Admin tarafından yasaklandı'
        },
        update: {
          value: streamBanReason || 'Admin tarafından yasaklandı'
        }
      })
      // End any active streams
      {
        // Önceden `status: 'active'` aranıyordu; canlı yayınlar 'live' olduğu
        // için hiçbiri kapanmıyordu.
        const liveStreams = await prisma.videoStream.findMany({
          where: { userId: params.userId, status: 'live' },
          select: { id: true },
        })
        await prisma.videoStream.updateMany({
          where: { userId: params.userId, status: { in: ['live', 'active'] } },
          data: { status: 'ended', endedAt: new Date() }
        })
        for (const ls of liveStreams) await finalizeStreamEnd(ls.id).catch(() => {})
      }
      return NextResponse.json({ success: true, message: 'User banned from streaming' })
    }

    if (action === 'unban_stream') {
      await prisma.platformSettings.deleteMany({
        where: { key: `stream_ban_${params.userId}` }
      })
      return NextResponse.json({ success: true, message: 'User unbanned from streaming' })
    }

    if (action === 'start_stream') {
      // Check if user is banned
      const streamBan = await prisma.platformSettings.findFirst({
        where: { key: `stream_ban_${params.userId}` }
      })
      if (streamBan) {
        return NextResponse.json({ error: 'User is banned from streaming' }, { status: 400 })
      }
      // Create a new stream for this user
      const stream = await prisma.videoStream.create({
        data: {
          userId: params.userId,
          title: 'Admin tarafından başlatıldı',
          status: 'active',
        }
      })
      return NextResponse.json({ success: true, streamId: stream.id, message: 'Stream started' })
    }

    if (action === 'end_stream') {
      {
        // Önceden `status: 'active'` aranıyordu; canlı yayınlar 'live' olduğu
        // için hiçbiri kapanmıyordu.
        const liveStreams = await prisma.videoStream.findMany({
          where: { userId: params.userId, status: 'live' },
          select: { id: true },
        })
        await prisma.videoStream.updateMany({
          where: { userId: params.userId, status: { in: ['live', 'active'] } },
          data: { status: 'ended', endedAt: new Date() }
        })
        for (const ls of liveStreams) await finalizeStreamEnd(ls.id).catch(() => {})
      }
      return NextResponse.json({ success: true, message: 'Streams ended' })
    }

    if (action === 'add_credits') {
      const user = await prisma.user.update({
        where: { id: params.userId },
        data: { credits: { increment: credits } },
        select: { credits: true, jetonBalance: true }
      })
      return NextResponse.json({ success: true, newCredits: user.credits, newJetons: user.jetonBalance })
    }

    if (action === 'remove_credits') {
      const user = await prisma.user.update({
        where: { id: params.userId },
        data: { credits: { decrement: Math.abs(credits) } },
        select: { credits: true, jetonBalance: true }
      })
      return NextResponse.json({ success: true, newCredits: user.credits, newJetons: user.jetonBalance })
    }

    if (action === 'set_credits') {
      const amount = Math.max(0, Number(body.amount) || 0)
      const user = await prisma.user.update({
        where: { id: params.userId },
        data: { credits: amount },
        select: { credits: true, jetonBalance: true }
      })
      return NextResponse.json({ success: true, newCredits: user.credits, newJetons: user.jetonBalance })
    }

    if (action === 'add_jetons') {
      const amount = Math.abs(Number(body.amount) || 0)
      const user = await prisma.user.update({
        where: { id: params.userId },
        data: { jetonBalance: { increment: amount } },
        select: { credits: true, jetonBalance: true }
      })
      return NextResponse.json({ success: true, newCredits: user.credits, newJetons: user.jetonBalance })
    }

    if (action === 'remove_jetons') {
      const amount = Math.abs(Number(body.amount) || 0)
      const user = await prisma.user.update({
        where: { id: params.userId },
        data: { jetonBalance: { decrement: amount } },
        select: { credits: true, jetonBalance: true }
      })
      return NextResponse.json({ success: true, newCredits: user.credits, newJetons: user.jetonBalance })
    }

    if (action === 'set_jetons') {
      const amount = Math.max(0, Number(body.amount) || 0)
      const user = await prisma.user.update({
        where: { id: params.userId },
        data: { jetonBalance: amount },
        select: { credits: true, jetonBalance: true }
      })
      return NextResponse.json({ success: true, newCredits: user.credits, newJetons: user.jetonBalance })
    }

    // General update
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (username !== undefined) updateData.username = username || null
    if (phone !== undefined) updateData.phone = phone || null
    if (image !== undefined) updateData.image = image || null
    if (role !== undefined) updateData.role = role
    if (membership !== undefined) updateData.membership = membership
    if (membershipExpiresAt !== undefined) {
      updateData.membershipExpiresAt = membershipExpiresAt ? new Date(membershipExpiresAt) : null
    }
    if (specialBadges !== undefined) updateData.specialBadges = specialBadges
    if (profileEffect !== undefined) updateData.profileEffect = profileEffect || null

    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        phone: true,
        image: true,
        role: true,
        membership: true,
        credits: true,
        jetonBalance: true,
      }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error('Error updating user:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email or username already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getStaffSession()
  if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'moderation.user.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  try {
    // Don't allow deleting yourself
    if ((session.user as any).id === params.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Hesap silme yalnız tam yöneticilere; kurucu hesabı yalnız kurucu silebilir.
    // (Önceden «kullanıcı görme» yetkisi olan moderatör/finans da silebiliyordu.)
    const actorRole = String((session.user as any).role || '')
    if (!isFullAdmin(actorRole)) {
      return NextResponse.json({ error: 'Hesap silme yalnız tam yöneticilere açıktır' }, { status: 403 })
    }
    const target = await prisma.user.findUnique({ where: { id: params.userId }, select: { role: true, email: true } })
    if (!target) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }
    if (target.role === 'kurucu' && actorRole !== 'kurucu') {
      return NextResponse.json({ error: 'Kurucu hesabı silinemez' }, { status: 403 })
    }
    recordAudit({
      actorId: String((session.user as any).id || ''),
      actorRole,
      action: 'user_delete',
      targetType: 'User',
      targetId: params.userId,
      before: { role: target.role, email: target.email },
      description: 'Admin hesap sildi',
      ip: getAuditIp(request),
    }).catch(() => {})

    // Delete user and related data
    await prisma.user.delete({
      where: { id: params.userId }
    })

    return NextResponse.json({ success: true, message: 'User deleted' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
