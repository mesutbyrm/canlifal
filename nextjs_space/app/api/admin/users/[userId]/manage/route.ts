/**
 * F7a: Kullanıcı Yönetim Paneli API
 * GET  — kullanıcı detay + yönetilebilir tüm bilgiler
 * POST — action-based management (jeton, CFC, Gold, ban, yetki, vb.)
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { recordMembershipJoin, recordMembershipLeave } from '@/lib/agency-membership-history'
import { resolveUser, isAdminRole, type ResolvedUser } from '@/lib/rbac'
import { hasPermission } from '@/lib/permissions'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { recordLedger } from '@/lib/ledger'
import { invalidateCache } from '@/lib/cache'
import { createNotificationWithPush } from '@/lib/notify'
import { requireConfirmation } from '@/lib/critical-confirm'
import { recordTimelineEventSafe } from '@/lib/user-timeline'

export const dynamic = 'force-dynamic'

type Ctx = { params: { userId: string } }

// ─── Helpers ──────────────────────────────────────────────────
async function guardPermission(
  admin: ResolvedUser,
  permissionKey: string
): Promise<NextResponse | null> {
  const allowed = await hasPermission(admin.role, permissionKey, admin.id)
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok' } },
      { status: 403 }
    )
  }
  return null
}

async function logAdminAction(p: {
  targetUserId: string
  adminId: string
  adminName?: string
  action: string
  oldValue?: any
  newValue?: any
  reason?: string
  metadata?: any
}) {
  try {
    await prisma.adminUserAction.create({
      data: {
        targetUserId: p.targetUserId,
        adminId: p.adminId,
        adminName: p.adminName || null,
        action: p.action,
        oldValue: p.oldValue != null ? JSON.stringify(p.oldValue) : null,
        newValue: p.newValue != null ? JSON.stringify(p.newValue) : null,
        reason: p.reason || null,
        metadata: p.metadata != null ? JSON.stringify(p.metadata) : null,
      },
    })
  } catch (e) {
    console.error('[AdminUserAction] log failed:', e)
  }
}

// ─── GET: Kullanıcı detay ────────────────────────────────────
export async function GET(req: NextRequest, { params }: Ctx) {
  const admin = await resolveUser(req)
  if (!admin || !isAdminRole(admin.role)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Yetkisiz' } },
      { status: 403 }
    )
  }

  const viewDenied = await guardPermission(admin, 'moderation.user.view')
  if (viewDenied) return viewDenied

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true, name: true, username: true, email: true, phone: true,
      image: true, bio: true, role: true, membership: true,
      membershipExpiresAt: true, credits: true, jetonBalance: true,
      cfcBalance: true, createdAt: true, lastActiveAt: true,
      isBanned: true, banReason: true, bannedAt: true, bannedUntil: true,
      bannedBy: true, canBroadcast: true, canCreateRoom: true,
      canChat: true, canSendGift: true, canPK: true, isVerifiedUser: true,
      xp: true, level: true, zodiacSign: true, referralCode: true,
      withdrawalLimit: true, isBot: true, loginStreak: true,
      totalTimeSpentMinutes: true,
      // Relations
      agencyMembership: {
        select: {
          id: true, role: true, isActive: true,
          agency: { select: { id: true, name: true } },
        },
      },
      fortuneTellerProfile: {
        select: {
          id: true, displayName: true, isVerified: true, rating: true,
          isOnline: true, isBanned: true, applicationStatus: true,
          totalEarnings: true, totalSessions: true,
        },
      },
      permissionOverrides: {
        select: { permissionKey: true, granted: true, grantedBy: true, reason: true, updatedAt: true },
      },
    },
  })

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı' } },
      { status: 404 }
    )
  }

  // Recent admin actions on this user
  const recentActions = await prisma.adminUserAction.findMany({
    where: { targetUserId: params.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ success: true, user, recentActions })
}

// ─── POST: Action-based management ──────────────────────────
export async function POST(req: NextRequest, { params }: Ctx) {
  const admin = await resolveUser(req)
  if (!admin || !isAdminRole(admin.role)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Yetkisiz' } },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { action, ...data } = body
  const ip = getAuditIp(req)

  // Fetch admin name for logging
  const adminUser = await prisma.user.findUnique({
    where: { id: admin.id },
    select: { name: true, username: true },
  })
  const adminName = adminUser?.username || adminUser?.name || admin.id

  // Fetch target user
  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true, name: true, username: true, role: true,
      credits: true, jetonBalance: true, cfcBalance: true,
      membership: true, membershipExpiresAt: true,
      isBanned: true, banReason: true, bannedAt: true, bannedUntil: true,
      canBroadcast: true, canCreateRoom: true, canChat: true,
      canSendGift: true, canPK: true, isVerifiedUser: true,
    },
  })

  if (!target) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı' } },
      { status: 404 }
    )
  }

  // Prevent managing higher-level admins (unless full admin)
  if (target.role === 'admin' && admin.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Üst düzey yöneticiyi yönetemezsiniz' } },
      { status: 403 }
    )
  }

  // ── KRİTİK İŞLEM ONAYI (spec §88) ─────────────────────────
  // Frontend onay göstermese bile backend `confirm: true` olmadan uygulamaz.
  {
    const targetName = target.username || target.name || target.id
    const confirmGuard = requireConfirmation(action, data.confirm, {
      targetName,
      amount: data.amount != null ? Number(data.amount) : 0,
      days: data.days,
      bannedUntil: data.bannedUntil || data.until,
      role: data.role,
    })
    if (confirmGuard) return confirmGuard
  }

  // ── JETON ADJUST ──────────────────────────────────────────
  if (action === 'jeton_adjust') {
    const denied = await guardPermission(admin, 'finance.jeton.adjust')
    if (denied) return denied

    const amount = parseInt(data.amount)
    const reason = data.reason || 'Admin ayarlaması'
    if (!amount || isNaN(amount)) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçersiz miktar' } }, { status: 400 })
    }

    const oldBalance = target.jetonBalance
    const newBalance = oldBalance + amount
    if (newBalance < 0) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Bakiye negatife düşemez' } }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: target.id }, data: { jetonBalance: newBalance } }),
      prisma.jetonTransaction.create({
        data: {
          userId: target.id,
          amount,
          type: 'admin_adjust',
          description: `Admin (${adminName}): ${reason}`,
          balanceBefore: oldBalance,
          balanceAfter: newBalance,
        },
      }),
    ])

    recordLedger({
      debit: amount > 0
        ? { accountType: 'platform_jeton', accountId: 'PLATFORM' }
        : { accountType: 'user_jeton' as any, accountId: target.id },
      credit: amount > 0
        ? { accountType: 'user_jeton' as any, accountId: target.id }
        : { accountType: 'platform_jeton', accountId: 'PLATFORM' },
      amount: Math.abs(amount),
      category: 'admin_adjust',
      currency: 'jeton',
      actorId: admin.id,
      metadata: { reason },
    }).catch(() => {})

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'jeton_adjust',
      oldValue: { jetonBalance: oldBalance },
      newValue: { jetonBalance: newBalance },
      reason,
    })

    recordAudit({ actorId: admin.id, action: 'user_manage_jeton_adjust', targetType: 'user', targetId: target.id, metadata: { action: 'jeton_adjust', oldBalance, newBalance, amount, reason }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: `Jeton bakiye güncellendi: ${oldBalance} → ${newBalance}`, newBalance })
  }

  // ── CFC ADJUST ────────────────────────────────────────────
  if (action === 'cfc_adjust') {
    const denied = await guardPermission(admin, 'finance.cfc.adjust')
    if (denied) return denied

    const amount = parseInt(data.amount)
    const reason = data.reason || 'Admin ayarlaması'
    if (!amount || isNaN(amount)) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçersiz miktar' } }, { status: 400 })
    }

    const oldBalance = target.credits
    const newBalance = oldBalance + amount
    if (newBalance < 0) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Bakiye negatife düşemez' } }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: target.id }, data: { credits: newBalance } }),
      prisma.creditTransaction.create({
        data: {
          userId: target.id,
          amount,
          type: 'admin_adjust',
          description: `Admin (${adminName}): ${reason}`,
          relatedId: admin.id,
          balance: newBalance,
        },
      }),
    ])

    recordLedger({
      debit: amount > 0
        ? { accountType: 'platform_cfc', accountId: 'PLATFORM' }
        : { accountType: 'user_cfc' as any, accountId: target.id },
      credit: amount > 0
        ? { accountType: 'user_cfc' as any, accountId: target.id }
        : { accountType: 'platform_cfc', accountId: 'PLATFORM' },
      amount: Math.abs(amount),
      category: 'admin_adjust',
      currency: 'cfc',
      actorId: admin.id,
      metadata: { reason },
    }).catch(() => {})

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'cfc_adjust',
      oldValue: { credits: oldBalance },
      newValue: { credits: newBalance },
      reason,
    })

    recordAudit({ actorId: admin.id, action: 'user_manage_cfc_adjust', targetType: 'user', targetId: target.id, metadata: { action: 'cfc_adjust', oldBalance, newBalance, amount, reason }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: `CFC bakiye güncellendi: ${oldBalance} → ${newBalance}`, newBalance })
  }

  // ── GOLD GRANT ────────────────────────────────────────────
  if (action === 'gold_grant') {
    const denied = await guardPermission(admin, 'moderation.user.gold')
    if (denied) return denied

    const days = parseInt(data.days)
    const goldType = data.goldType || 'gold' // gold, premium, vip
    if (!days || days < 1) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçerli gün sayısı gerekli' } }, { status: 400 })
    }

    const now = new Date()
    const currentExpiry = target.membershipExpiresAt && target.membershipExpiresAt > now
      ? target.membershipExpiresAt
      : now
    const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: target.id },
      data: { membership: goldType, membershipExpiresAt: newExpiry },
    })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'gold_grant',
      oldValue: { membership: target.membership, membershipExpiresAt: target.membershipExpiresAt },
      newValue: { membership: goldType, membershipExpiresAt: newExpiry },
      reason: data.reason || `${days} gün ${goldType} verildi`,
    })

    recordAudit({ actorId: admin.id, action: 'user_manage_gold_grant', targetType: 'user', targetId: target.id, metadata: { action: 'gold_grant', goldType, days, newExpiry }, ip }).catch(() => {})

    createNotificationWithPush({
      userId: target.id,
      type: 'gold_granted',
      title: 'Gold Üyelik Tanımlandı! 👑',
      message: `${days} günlük ${goldType} üyeliğiniz hesabınıza tanımlandı.`,
    }).catch(() => {})

    return NextResponse.json({ success: true, message: `${days} gün ${goldType} üyelik verildi. Bitiş: ${newExpiry.toISOString()}` })
  }

  // ── GOLD REVOKE ───────────────────────────────────────────
  if (action === 'gold_revoke') {
    const denied = await guardPermission(admin, 'moderation.user.gold')
    if (denied) return denied

    await prisma.user.update({
      where: { id: target.id },
      data: { membership: 'basic', membershipExpiresAt: null },
    })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'gold_revoke',
      oldValue: { membership: target.membership, membershipExpiresAt: target.membershipExpiresAt },
      newValue: { membership: 'basic', membershipExpiresAt: null },
      reason: data.reason || 'Gold üyelik geri alındı',
    })

    recordAudit({ actorId: admin.id, action: 'user_manage_gold_revoke', targetType: 'user', targetId: target.id, metadata: { action: 'gold_revoke' }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: 'Gold üyelik geri alındı' })
  }

  // ── BAN ───────────────────────────────────────────────────
  if (action === 'ban') {
    const denied = await guardPermission(admin, 'moderation.user.ban')
    if (denied) return denied

    const banDays = data.days ? parseInt(data.days) : null // null = permanent
    const bannedUntil = banDays ? new Date(Date.now() + banDays * 24 * 60 * 60 * 1000) : null

    await prisma.user.update({
      where: { id: target.id },
      data: {
        isBanned: true,
        banReason: data.reason || 'Admin tarafından yasaklandı',
        bannedAt: new Date(),
        bannedUntil,
        bannedBy: admin.id,
      },
    })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'ban',
      oldValue: { isBanned: target.isBanned },
      newValue: { isBanned: true, bannedUntil, banReason: data.reason },
      reason: data.reason,
    })

    recordAudit({ actorId: admin.id, action: 'user_manage_ban', targetType: 'user', targetId: target.id, metadata: { action: 'ban', banDays, reason: data.reason }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: bannedUntil ? `${banDays} gün yasaklandı` : 'Kalıcı yasaklandı' })
  }

  // ── UNBAN ─────────────────────────────────────────────────
  if (action === 'unban') {
    const denied = await guardPermission(admin, 'moderation.user.unban')
    if (denied) return denied

    await prisma.user.update({
      where: { id: target.id },
      data: {
        isBanned: false,
        banReason: null,
        bannedAt: null,
        bannedUntil: null,
        bannedBy: null,
      },
    })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'unban',
      oldValue: { isBanned: true, banReason: target.banReason },
      newValue: { isBanned: false },
      reason: data.reason || 'Yasak kaldırıldı',
    })

    recordAudit({ actorId: admin.id, action: 'user_manage_unban', targetType: 'user', targetId: target.id, metadata: { action: 'unban', reason: data.reason }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: 'Kullanıcı yasağı kaldırıldı' })
  }

  // ── ROLE CHANGE ───────────────────────────────────────────
  if (action === 'role_change') {
    const denied = await guardPermission(admin, 'moderation.user.role')
    if (denied) return denied

    const newRole = data.role
    if (!newRole) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Yeni rol gerekli' } }, { status: 400 })
    }

    // Only full admin can assign admin/yonetici
    if (['admin', 'yonetici'].includes(newRole) && admin.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Sadece ana admin bu rolü atayabilir' } },
        { status: 403 }
      )
    }

    await prisma.user.update({ where: { id: target.id }, data: { role: newRole } })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'role_change',
      oldValue: { role: target.role },
      newValue: { role: newRole },
      reason: data.reason,
    })

    recordAudit({ actorId: admin.id, action: 'user_manage_role_change', targetType: 'user', targetId: target.id, metadata: { action: 'role_change', oldRole: target.role, newRole }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: `Rol değiştirildi: ${target.role} → ${newRole}` })
  }

  // ── BROADCAST TOGGLE ──────────────────────────────────────
  if (action === 'broadcast_toggle') {
    const denied = await guardPermission(admin, 'moderation.user.broadcast')
    if (denied) return denied

    const canBroadcast = !!data.enabled
    await prisma.user.update({ where: { id: target.id }, data: { canBroadcast } })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'broadcast_toggle',
      oldValue: { canBroadcast: target.canBroadcast },
      newValue: { canBroadcast },
      reason: data.reason,
    })

    recordAudit({ actorId: admin.id, action: 'user_manage_broadcast_toggle', targetType: 'user', targetId: target.id, metadata: { action: 'broadcast_toggle', canBroadcast }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: canBroadcast ? 'Yayın yetkisi açıldı' : 'Yayın yetkisi kapatıldı' })
  }

  // ── ROOM TOGGLE ───────────────────────────────────────────
  if (action === 'room_toggle') {
    const denied = await guardPermission(admin, 'moderation.user.room')
    if (denied) return denied

    const canCreateRoom = !!data.enabled
    await prisma.user.update({ where: { id: target.id }, data: { canCreateRoom } })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'room_toggle',
      oldValue: { canCreateRoom: target.canCreateRoom },
      newValue: { canCreateRoom },
      reason: data.reason,
    })

    recordAudit({ actorId: admin.id, action: 'user_manage_room_toggle', targetType: 'user', targetId: target.id, metadata: { action: 'room_toggle', canCreateRoom }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: canCreateRoom ? 'Oda yetkisi açıldı' : 'Oda yetkisi kapatıldı' })
  }

  // ── CHAT / GIFT / PK TOGGLE ───────────────────────────────
  if (action === 'toggle_feature') {
    const denied = await guardPermission(admin, 'moderation.user.edit')
    if (denied) return denied

    const field = data.field as string
    const allowed = ['canChat', 'canSendGift', 'canPK', 'isVerifiedUser']
    if (!allowed.includes(field)) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçersiz alan' } }, { status: 400 })
    }

    const enabled = !!data.enabled
    await prisma.user.update({ where: { id: target.id }, data: { [field]: enabled } })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'toggle_feature',
      oldValue: { [field]: (target as any)[field] },
      newValue: { [field]: enabled },
      reason: data.reason,
    })

    recordAudit({ actorId: admin.id, action: 'user_manage_toggle_feature', targetType: 'user', targetId: target.id, metadata: { action: 'toggle_feature', field, enabled }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: `${field} ${enabled ? 'açıldı' : 'kapatıldı'}` })
  }

  // ── PERMISSION OVERRIDE ───────────────────────────────────
  if (action === 'set_permission') {
    const denied = await guardPermission(admin, 'system.role.manage')
    if (denied) return denied

    const { permissionKey, granted } = data
    if (!permissionKey) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'İzin anahtarı gerekli' } }, { status: 400 })
    }

    if (granted === null || granted === undefined) {
      // Remove override
      await prisma.userPermissionOverride.deleteMany({
        where: { userId: target.id, permissionKey },
      })
    } else {
      await prisma.userPermissionOverride.upsert({
        where: { userId_permissionKey: { userId: target.id, permissionKey } },
        update: { granted: !!granted, grantedBy: admin.id, reason: data.reason },
        create: {
          userId: target.id,
          permissionKey,
          granted: !!granted,
          grantedBy: admin.id,
          reason: data.reason,
        },
      })
    }

    // Invalidate user permission cache
    invalidateCache(`rbac:user:${target.id}`)

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'permission_change',
      newValue: { permissionKey, granted },
      reason: data.reason,
    })

    recordAudit({ actorId: admin.id, action: 'user_manage_permission_change', targetType: 'user', targetId: target.id, metadata: { action: 'permission_change', permissionKey, granted }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: `İzin güncellendi: ${permissionKey} → ${granted === null ? 'kaldırıldı' : granted ? 'verildi' : 'engellendi'}` })
  }

  // ── BULK SET PERMISSIONS ───────────────────────────────────
  if (action === 'set_permissions_bulk') {
    const denied = await guardPermission(admin, 'system.role.manage')
    if (denied) return denied

    const permissions = data.permissions as Array<{ key: string; granted: boolean }>
    if (!Array.isArray(permissions)) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçersiz izin listesi' } }, { status: 400 })
    }

    // Delete all existing overrides for this user, then create new ones
    await prisma.$transaction([
      prisma.userPermissionOverride.deleteMany({ where: { userId: target.id } }),
      prisma.userPermissionOverride.createMany({
        data: permissions.map((p) => ({
          userId: target.id,
          permissionKey: p.key,
          granted: p.granted,
          grantedBy: admin.id,
          reason: data.reason || 'Toplu izin güncelleme',
        })),
        skipDuplicates: true,
      }),
    ])

    invalidateCache(`rbac:user:${target.id}`)

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'permissions_bulk',
      newValue: { count: permissions.length, permissions: permissions.map((p) => `${p.key}:${p.granted}`) },
      reason: data.reason,
    })

    return NextResponse.json({ success: true, message: `${permissions.length} izin güncellendi` })
  }

  // ── WITHDRAWAL LIMIT ──────────────────────────────────────
  if (action === 'set_withdrawal_limit') {
    const denied = await guardPermission(admin, 'finance.balance.adjust')
    if (denied) return denied

    const limit = parseInt(data.limit)
    if (isNaN(limit) || limit < 0) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçersiz limit' } }, { status: 400 })
    }

    await prisma.user.update({ where: { id: target.id }, data: { withdrawalLimit: limit } })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName,
      action: 'set_withdrawal_limit',
      oldValue: { withdrawalLimit: (target as any).withdrawalLimit },
      newValue: { withdrawalLimit: limit },
      reason: data.reason,
    })

    return NextResponse.json({ success: true, message: `Çekim limiti güncellendi: ${limit}` })
  }

  // ══════════════════════════════════════════════════════════
  // BÖLÜM 21 / A2 — Gelişmiş kullanıcı yönetim işlemleri
  // ══════════════════════════════════════════════════════════

  // ── HESAP DONDUR ──────────────────────────────────────────
  if (action === 'freeze') {
    const denied = await guardPermission(admin, 'moderation.user.freeze')
    if (denied) return denied

    await prisma.user.update({
      where: { id: target.id },
      data: { isFrozen: true, frozenAt: new Date(), frozenReason: data.reason || 'Yönetici tarafından donduruldu' } as any,
    })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName, action: 'freeze',
      oldValue: { isFrozen: (target as any).isFrozen ?? false },
      newValue: { isFrozen: true, frozenReason: data.reason },
      reason: data.reason,
    })
    recordAudit({ actorId: admin.id, action: 'user_manage_freeze', targetType: 'user', targetId: target.id, metadata: { reason: data.reason }, ip }).catch(() => {})
    recordTimelineEventSafe({ userId: target.id, type: 'moderation', title: 'Hesap donduruldu', description: data.reason || null, metadata: { adminId: admin.id } })

    return NextResponse.json({ success: true, message: 'Hesap donduruldu' })
  }

  // ── HESAP DONDURMAYI KALDIR ───────────────────────────────
  if (action === 'unfreeze') {
    const denied = await guardPermission(admin, 'moderation.user.freeze')
    if (denied) return denied

    await prisma.user.update({
      where: { id: target.id },
      data: { isFrozen: false, frozenAt: null, frozenReason: null } as any,
    })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName, action: 'unfreeze',
      oldValue: { isFrozen: true }, newValue: { isFrozen: false }, reason: data.reason,
    })
    recordAudit({ actorId: admin.id, action: 'user_manage_unfreeze', targetType: 'user', targetId: target.id, metadata: { reason: data.reason }, ip }).catch(() => {})
    recordTimelineEventSafe({ userId: target.id, type: 'moderation', title: 'Hesap dondurması kaldırıldı', description: data.reason || null })

    return NextResponse.json({ success: true, message: 'Hesap dondurması kaldırıldı' })
  }

  // ── UYARI GÖNDER ──────────────────────────────────────────
  if (action === 'warn') {
    const denied = await guardPermission(admin, 'moderation.user.mute')
    if (denied) return denied

    const reason = (data.reason || '').trim()
    if (!reason) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Uyarı sebebi zorunlu' } }, { status: 400 })
    }
    const severity = ['info', 'warning', 'severe'].includes(data.severity) ? data.severity : 'warning'
    const expiresAt = data.expiresInDays ? new Date(Date.now() + parseInt(data.expiresInDays) * 86400000) : null

    const [warning, updated] = await prisma.$transaction([
      prisma.userWarning.create({
        data: { userId: target.id, adminId: admin.id, adminName: adminName || null, reason, severity, expiresAt },
      }),
      prisma.user.update({ where: { id: target.id }, data: { warningCount: { increment: 1 } } as any }),
    ])

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName, action: 'warn',
      newValue: { warningId: warning.id, severity, warningCount: (updated as any).warningCount }, reason,
    })
    recordAudit({ actorId: admin.id, action: 'user_manage_warn', targetType: 'user', targetId: target.id, metadata: { severity, reason }, ip }).catch(() => {})
    recordTimelineEventSafe({ userId: target.id, type: 'moderation', title: 'Uyarı verildi', description: reason, metadata: { severity } })

    createNotificationWithPush({
      userId: target.id, type: 'moderation_warning',
      title: 'Uyarı Aldınız ⚠️', message: reason,
    }).catch(() => {})

    return NextResponse.json({ success: true, message: 'Uyarı kaydedildi', data: { warningId: warning.id, warningCount: (updated as any).warningCount } })
  }

  // ── UYARI SİL ─────────────────────────────────────────────
  if (action === 'warning_clear') {
    const denied = await guardPermission(admin, 'moderation.user.mute')
    if (denied) return denied

    const warningId = data.warningId
    if (!warningId) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'warningId gerekli' } }, { status: 400 })
    }
    const w = await prisma.userWarning.findUnique({ where: { id: warningId } })
    if (!w || w.userId !== target.id) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Uyarı bulunamadı' } }, { status: 404 })
    }
    await prisma.$transaction([
      prisma.userWarning.delete({ where: { id: warningId } }),
      prisma.user.update({ where: { id: target.id }, data: { warningCount: { decrement: 1 } } as any }),
    ])

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName, action: 'warning_clear',
      oldValue: { warningId, reason: w.reason }, reason: data.reason,
    })
    recordAudit({ actorId: admin.id, action: 'user_manage_warning_clear', targetType: 'user', targetId: target.id, metadata: { warningId }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: 'Uyarı silindi' })
  }

  // ── KEŞFETTEN GİZLE / GÖSTER ──────────────────────────────
  if (action === 'discovery_hide' || action === 'discovery_show') {
    const denied = await guardPermission(admin, 'social.discovery.manage')
    if (denied) return denied

    const hidden = action === 'discovery_hide'
    await prisma.user.update({ where: { id: target.id }, data: { hiddenFromDiscovery: hidden } as any })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName, action,
      oldValue: { hiddenFromDiscovery: (target as any).hiddenFromDiscovery ?? false },
      newValue: { hiddenFromDiscovery: hidden }, reason: data.reason,
    })
    recordAudit({ actorId: admin.id, action: `user_manage_${action}`, targetType: 'user', targetId: target.id, metadata: { reason: data.reason }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: hidden ? 'Kullanıcı keşfetten gizlendi' : 'Kullanıcı keşfette tekrar görünür' })
  }

  // §37 keşfet önceliği
  if (action === 'discovery_priority_set' || action === 'discovery_priority_unset') {
    const denied = await guardPermission(admin, 'social.discovery.manage')
    if (denied) return denied
    const priority = action === 'discovery_priority_set' ? (parseInt(data.priority) || 10) : 0
    await prisma.user.update({ where: { id: target.id }, data: { discoveryPriority: priority } as any })
    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName, action,
      oldValue: { discoveryPriority: (target as any).discoveryPriority ?? 0 },
      newValue: { discoveryPriority: priority }, reason: data.reason,
    })
    recordAudit({ actorId: admin.id, action: `user_manage_${action}`, targetType: 'user', targetId: target.id, metadata: { priority }, ip }).catch(() => {})
    return NextResponse.json({ success: true, message: priority > 0 ? 'Keşfet önceliği verildi' : 'Keşfet önceliği kaldırıldı' })
  }

  // ── FALCI YETKİSİ ─────────────────────────────────────────
  if (action.startsWith('teller_')) {
    const denied = await guardPermission(admin, 'moderation.user.fortuneteller')
    if (denied) return denied

    const teller = await prisma.liveFortuneTeller.findUnique({ where: { userId: target.id } })
    if (!teller) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Kullanıcının falcı kaydı yok' } }, { status: 404 })
    }

    let patch: any = {}
    let message = ''
    switch (action) {
      case 'teller_approve':
        patch = { applicationStatus: 'approved', approvedAt: new Date(), rejectedAt: null, isActive: true }
        message = 'Falcı başvurusu onaylandı'
        break
      case 'teller_reject':
        patch = { applicationStatus: 'rejected', rejectedAt: new Date(), isActive: false, isOnline: false }
        message = 'Falcı başvurusu reddedildi'
        break
      case 'teller_freeze':
        patch = { isFrozen: true, frozenAt: new Date(), freezeReason: data.reason || 'Yönetici kararı', isOnline: false }
        message = 'Falcı hesabı donduruldu'
        break
      case 'teller_unfreeze':
        patch = { isFrozen: false, frozenAt: null, freezeReason: null }
        message = 'Falcı dondurması kaldırıldı'
        break
      case 'teller_ban':
        patch = { isBanned: true, bannedAt: new Date(), banReason: data.reason || 'Yönetici kararı', isOnline: false, isActive: false }
        message = 'Falcı yasaklandı'
        break
      case 'teller_unban':
        patch = { isBanned: false, bannedAt: null, banReason: null, isActive: true }
        message = 'Falcı yasağı kaldırıldı'
        break
      case 'teller_flags': {
        const allowed = ['canGoOnline', 'canChat', 'canStartSession', 'canSetPrice', 'canEditProfile', 'canViewEarnings', 'canWithdraw']
        const flags = data.flags || {}
        for (const k of allowed) if (typeof flags[k] === 'boolean') patch[k] = flags[k]
        if (Object.keys(patch).length === 0) {
          return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçerli bayrak gönderilmedi' } }, { status: 400 })
        }
        message = 'Falcı yetkileri güncellendi'
        break
      }
      default:
        return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: `Geçersiz falcı işlemi: ${action}` } }, { status: 400 })
    }

    await prisma.liveFortuneTeller.update({ where: { userId: target.id }, data: patch })

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName, action,
      oldValue: { applicationStatus: teller.applicationStatus, isBanned: teller.isBanned, isFrozen: teller.isFrozen },
      newValue: patch, reason: data.reason,
    })
    recordAudit({ actorId: admin.id, action: `user_manage_${action}`, targetType: 'live_fortune_teller', targetId: teller.id, metadata: { patch, reason: data.reason }, ip }).catch(() => {})
    recordTimelineEventSafe({ userId: target.id, type: 'fortune_teller', title: message, description: data.reason || null })

    return NextResponse.json({ success: true, message })
  }

  // ── AJANS BAĞLANTISI ──────────────────────────────────────
  if (action === 'agency_add' || action === 'agency_change') {
    const denied = await guardPermission(admin, 'moderation.user.agency')
    if (denied) return denied

    const agencyId = data.agencyId
    if (!agencyId) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'agencyId gerekli' } }, { status: 400 })
    }
    const agency = await prisma.agency.findUnique({ where: { id: agencyId }, select: { id: true, name: true, status: true } })
    if (!agency) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ajans bulunamadı' } }, { status: 404 })
    }

    const existing = await prisma.agencyUser.findUnique({ where: { userId: target.id } })
    const role = ['owner', 'manager', 'member'].includes(data.agencyRole) ? data.agencyRole : 'member'

    if (existing) {
      await prisma.agencyUser.update({
        where: { userId: target.id },
        data: { agencyId, role, isActive: true, leftAt: null, joinedVia: 'admin' },
      })
      if (existing.agencyId !== agencyId || !existing.isActive) {
        if (existing.isActive) {
          await recordMembershipLeave({ agencyId: existing.agencyId, userId: target.id, endedBy: 'transfer', actorId: admin.id, joinedAt: existing.joinedAt, role: existing.role })
        }
        await recordMembershipJoin({ agencyId, userId: target.id, role, via: 'admin', actorId: admin.id })
      }
    } else {
      await prisma.agencyUser.create({
        data: { agencyId, userId: target.id, role, joinedVia: 'admin', isActive: true },
      })
      await recordMembershipJoin({ agencyId, userId: target.id, role, via: 'admin', actorId: admin.id })
    }

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName, action,
      oldValue: existing ? { agencyId: existing.agencyId, role: existing.role } : null,
      newValue: { agencyId, agencyName: agency.name, role }, reason: data.reason,
    })
    recordAudit({ actorId: admin.id, action: `user_manage_${action}`, targetType: 'agency', targetId: agencyId, metadata: { userId: target.id, role }, ip }).catch(() => {})
    recordTimelineEventSafe({ userId: target.id, type: 'agency', title: `Ajansa eklendi: ${agency.name}`, metadata: { agencyId, role } })

    return NextResponse.json({ success: true, message: `Kullanıcı ${agency.name} ajansına bağlandı` })
  }

  if (action === 'agency_remove') {
    const denied = await guardPermission(admin, 'moderation.user.agency')
    if (denied) return denied

    const existing = await prisma.agencyUser.findUnique({ where: { userId: target.id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Kullanıcı bir ajansa bağlı değil' } }, { status: 404 })
    }
    await prisma.agencyUser.update({ where: { userId: target.id }, data: { isActive: false, leftAt: new Date() } })
    if (existing.isActive) {
      await recordMembershipLeave({ agencyId: existing.agencyId, userId: target.id, endedBy: 'admin', actorId: admin.id, reason: data.reason ?? null, joinedAt: existing.joinedAt, role: existing.role })
    }

    await logAdminAction({
      targetUserId: target.id, adminId: admin.id, adminName, action: 'agency_remove',
      oldValue: { agencyId: existing.agencyId, role: existing.role }, newValue: { isActive: false }, reason: data.reason,
    })
    recordAudit({ actorId: admin.id, action: 'user_manage_agency_remove', targetType: 'agency', targetId: existing.agencyId, metadata: { userId: target.id }, ip }).catch(() => {})
    recordTimelineEventSafe({ userId: target.id, type: 'agency', title: 'Ajans bağlantısı kaldırıldı', description: data.reason || null })

    return NextResponse.json({ success: true, message: 'Kullanıcının ajans bağlantısı kaldırıldı' })
  }

  return NextResponse.json(
    { success: false, error: { code: 'BAD_REQUEST', message: `Geçersiz işlem: ${action}` } },
    { status: 400 }
  )
}
