/**
 * F7b: Ajans Yönetim API (§56-59)
 * GET  — Ajans listeleme (filtre + sayfalama + istatistik)
 * PATCH — Ajans işlemleri (approve, reject, suspend, reactivate, penalty, update)
 * DELETE — Ajans silme
 * POST — Ajans oluşturma + üye yönetimi actions
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser, isAdminRole, type ResolvedUser } from '@/lib/rbac'
import { hasPermission } from '@/lib/permissions'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

async function guardPerm(admin: ResolvedUser, perm: string): Promise<NextResponse | null> {
  const ok = await hasPermission(admin.role, perm, admin.id)
  if (!ok) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok' } }, { status: 403 })
  return null
}

// Check if user is agency manager for a specific agency
async function isAgencyManager(userId: string, agencyId: string): Promise<boolean> {
  const membership = await prisma.agencyUser.findUnique({ where: { userId } })
  if (!membership) return false
  return membership.agencyId === agencyId && ['owner', 'manager'].includes(membership.role)
}

// GET: List all agencies
export async function GET(req: NextRequest) {
  const admin = await resolveUser(req)
  if (!admin || !isAdminRole(admin.role)) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Yetkisiz' } }, { status: 403 })
  }

  const denied = await guardPerm(admin, 'agency.manage')
  if (denied) return denied

  const sp = req.nextUrl.searchParams
  const status = sp.get('status') || undefined
  const search = sp.get('search') || undefined
  const page = parseInt(sp.get('page') || '1')
  const limit = Math.min(parseInt(sp.get('limit') || '20'), 100)
  const view = sp.get('view') || 'list'

  // ── Agency stats view
  if (view === 'stats') {
    const agencyId = sp.get('agencyId')
    if (!agencyId) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'agencyId gerekli' } }, { status: 400 })
    }

    const [agency, members, earnings, penalties] = await Promise.all([
      prisma.agency.findUnique({ where: { id: agencyId } }),
      prisma.agencyUser.findMany({
        where: { agencyId },
        include: { user: { select: { id: true, name: true, username: true, image: true, lastActiveAt: true } } },
        orderBy: { totalEarnings: 'desc' },
      }),
      prisma.agencyEarning.aggregate({ where: { agencyId }, _sum: { amount: true, originalAmount: true }, _count: true }),
      prisma.agencyPenalty.findMany({ where: { agencyId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ])

    if (!agency) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ajans bulunamadı' } }, { status: 404 })
    }

    const activeMembers = members.filter((m: any) => m.isActive)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recentlyActive = members.filter((m: any) => m.user?.lastActiveAt && m.user.lastActiveAt > weekAgo)

    return NextResponse.json({
      success: true,
      agency,
      stats: {
        totalMembers: members.length,
        activeMembers: activeMembers.length,
        recentlyActiveMembers: recentlyActive.length,
        totalEarnings: earnings._sum.amount || 0,
        totalOriginalAmount: earnings._sum.originalAmount || 0,
        earningCount: earnings._count,
        activePenalties: penalties.filter((p: any) => p.isActive).length,
      },
      members,
      penalties,
    })
  }

  // ── Members view
  if (view === 'members') {
    const agencyId = sp.get('agencyId')
    if (!agencyId) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'agencyId gerekli' } }, { status: 400 })
    }

    const [members, total] = await Promise.all([
      prisma.agencyUser.findMany({
        where: { agencyId },
        include: {
          user: {
            select: {
              id: true, name: true, username: true, image: true,
              lastActiveAt: true, membership: true, role: true,
              canBroadcast: true, canCreateRoom: true,
            },
          },
        },
        orderBy: { totalEarnings: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.agencyUser.count({ where: { agencyId } }),
    ])

    return NextResponse.json({ success: true, members, total, page, totalPages: Math.ceil(total / limit) })
  }

  // ── Default: list agencies
  const where: any = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { ownerName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [agencies, total] = await Promise.all([
    prisma.agency.findMany({
      where,
      include: {
        _count: { select: { members: true, earnings: true, inviteCodes: true, penalties: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.agency.count({ where }),
  ])

  return NextResponse.json({ success: true, agencies, total, page, totalPages: Math.ceil(total / limit) })
}

// POST: Create agency + member management
export async function POST(req: NextRequest) {
  const admin = await resolveUser(req)
  if (!admin || !isAdminRole(admin.role)) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Yetkisiz' } }, { status: 403 })
  }

  const body = await req.json()
  const { action, ...data } = body
  const ip = getAuditIp(req)

  // ── CREATE AGENCY
  if (action === 'create') {
    const denied = await guardPerm(admin, 'agency.manage')
    if (denied) return denied

    const { name, description, ownerId, ownerName, commissionRate, contactEmail, contactPhone, logoUrl } = data
    if (!name || !ownerId) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Ad ve sahip gerekli' } }, { status: 400 })
    }

    // Check existing
    const existing = await prisma.agency.findFirst({ where: { name } })
    if (existing) {
      return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: 'Bu isimde ajans zaten mevcut' } }, { status: 409 })
    }

    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { name: true, username: true } })

    const agency = await prisma.agency.create({
      data: {
        name,
        description: description || null,
        ownerId,
        ownerName: ownerName || owner?.username || owner?.name || 'Bilinmeyen',
        status: 'approved',
        approvedAt: new Date(),
        commissionRate: commissionRate ? parseFloat(commissionRate) : 5.0,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        logoUrl: logoUrl || null,
      },
    })

    // Auto-add owner as member
    await prisma.agencyUser.create({
      data: { agencyId: agency.id, userId: ownerId, role: 'owner', joinedVia: 'direct' },
    })
    await prisma.agency.update({ where: { id: agency.id }, data: { totalMembers: 1, activeMembers: 1 } })

    recordAudit({ actorId: admin.id, action: 'agency_create', targetType: 'agency', targetId: agency.id, metadata: { name }, ip }).catch(() => {})

    return NextResponse.json({ success: true, agency, message: 'Ajans oluşturuldu' })
  }

  // ── ADD MEMBER
  if (action === 'add_member') {
    const denied = await guardPerm(admin, 'agency.member.manage')
    if (denied) return denied

    const { agencyId, userId, role: memberRole } = data
    if (!agencyId || !userId) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'agencyId ve userId gerekli' } }, { status: 400 })
    }

    // Check if user already in an agency
    const existingMembership = await prisma.agencyUser.findUnique({ where: { userId } })
    if (existingMembership) {
      return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: 'Kullanıcı zaten bir ajansa üye' } }, { status: 409 })
    }

    await prisma.agencyUser.create({
      data: { agencyId, userId, role: memberRole || 'member', joinedVia: 'admin' },
    })

    await prisma.agency.update({
      where: { id: agencyId },
      data: { totalMembers: { increment: 1 }, activeMembers: { increment: 1 } },
    })

    recordAudit({ actorId: admin.id, action: 'agency_add_member', targetType: 'agency', targetId: agencyId, metadata: { userId, role: memberRole }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: 'Üye eklendi' })
  }

  // ── REMOVE MEMBER
  if (action === 'remove_member') {
    const denied = await guardPerm(admin, 'agency.member.manage')
    if (denied) return denied

    const { agencyId, userId } = data
    if (!agencyId || !userId) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'agencyId ve userId gerekli' } }, { status: 400 })
    }

    const membership = await prisma.agencyUser.findFirst({ where: { agencyId, userId } })
    if (!membership) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Üye bulunamadı' } }, { status: 404 })
    }

    await prisma.agencyUser.delete({ where: { id: membership.id } })
    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        totalMembers: { decrement: 1 },
        ...(membership.isActive ? { activeMembers: { decrement: 1 } } : {}),
      },
    })

    recordAudit({ actorId: admin.id, action: 'agency_remove_member', targetType: 'agency', targetId: agencyId, metadata: { userId, removedRole: membership.role }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: 'Üye çıkarıldı' })
  }

  // ── CHANGE MEMBER ROLE
  if (action === 'change_member_role') {
    const denied = await guardPerm(admin, 'agency.member.manage')
    if (denied) return denied

    const { agencyId, userId, role: newRole } = data
    if (!agencyId || !userId || !newRole) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'agencyId, userId ve role gerekli' } }, { status: 400 })
    }

    const validRoles = ['owner', 'manager', 'member']
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçersiz rol' } }, { status: 400 })
    }

    const membership = await prisma.agencyUser.findFirst({ where: { agencyId, userId } })
    if (!membership) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Üye bulunamadı' } }, { status: 404 })
    }

    await prisma.agencyUser.update({ where: { id: membership.id }, data: { role: newRole } })

    recordAudit({ actorId: admin.id, action: 'agency_change_role', targetType: 'agency', targetId: agencyId, metadata: { userId, oldRole: membership.role, newRole }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: `Üye rolü değiştirildi: ${membership.role} → ${newRole}` })
  }

  // ── TRANSFER MEMBER
  if (action === 'transfer_member') {
    const denied = await guardPerm(admin, 'agency.member.manage')
    if (denied) return denied

    const { userId, fromAgencyId, toAgencyId } = data
    if (!userId || !fromAgencyId || !toAgencyId) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'userId, fromAgencyId ve toAgencyId gerekli' } }, { status: 400 })
    }

    const membership = await prisma.agencyUser.findFirst({ where: { agencyId: fromAgencyId, userId } })
    if (!membership) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Üye bulunamadı' } }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.agencyUser.update({ where: { id: membership.id }, data: { agencyId: toAgencyId, role: 'member' } }),
      prisma.agency.update({ where: { id: fromAgencyId }, data: { totalMembers: { decrement: 1 }, activeMembers: { decrement: membership.isActive ? 1 : 0 } } }),
      prisma.agency.update({ where: { id: toAgencyId }, data: { totalMembers: { increment: 1 }, activeMembers: { increment: membership.isActive ? 1 : 0 } } }),
    ])

    recordAudit({ actorId: admin.id, action: 'agency_transfer_member', targetType: 'agency', targetId: toAgencyId, metadata: { userId, fromAgencyId, toAgencyId }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: 'Üye transfer edildi' })
  }

  // ── CHANGE OWNER (§44)
  if (action === 'change_owner') {
    const denied = await guardPerm(admin, 'agency.manage')
    if (denied) return denied

    const { agencyId: chAgencyId, newOwnerId } = data
    if (!chAgencyId || !newOwnerId) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'agencyId ve newOwnerId gerekli' } }, { status: 400 })
    }
    const ag = await prisma.agency.findUnique({ where: { id: chAgencyId }, select: { id: true, ownerId: true, name: true } })
    if (!ag) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ajans bulunamadı' } }, { status: 404 })
    const newOwner = await prisma.user.findUnique({ where: { id: newOwnerId }, select: { id: true, name: true, username: true } })
    if (!newOwner) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Yeni sahip bulunamadı' } }, { status: 404 })

    const oldOwnerMembership = await prisma.agencyUser.findFirst({ where: { agencyId: chAgencyId, userId: ag.ownerId } })
    if (oldOwnerMembership) await prisma.agencyUser.update({ where: { id: oldOwnerMembership.id }, data: { role: 'manager' } })
    const newOwnerMembership = await prisma.agencyUser.findFirst({ where: { agencyId: chAgencyId, userId: newOwnerId } })
    if (newOwnerMembership) {
      await prisma.agencyUser.update({ where: { id: newOwnerMembership.id }, data: { role: 'owner' } })
    } else {
      await prisma.agencyUser.create({ data: { agencyId: chAgencyId, userId: newOwnerId, role: 'owner', joinedVia: 'admin' } })
      await prisma.agency.update({ where: { id: chAgencyId }, data: { totalMembers: { increment: 1 }, activeMembers: { increment: 1 } } })
    }
    await prisma.agency.update({ where: { id: chAgencyId }, data: { ownerId: newOwnerId, ownerName: newOwner.username || newOwner.name || 'Bilinmeyen' } })

    recordAudit({ actorId: admin.id, action: 'agency_change_owner', targetType: 'agency', targetId: chAgencyId, metadata: { oldOwnerId: ag.ownerId, newOwnerId }, ip }).catch(() => {})

    return NextResponse.json({ success: true, message: `Ajans sahibi değiştirildi: ${newOwner.name || newOwner.username}` })
  }

  return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: `Geçersiz işlem: ${action}` } }, { status: 400 })
}

// PATCH: Update agency (approve, reject, suspend, reactivate, penalty, update)
export async function PATCH(req: NextRequest) {
  const admin = await resolveUser(req)
  if (!admin || !isAdminRole(admin.role)) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Yetkisiz' } }, { status: 403 })
  }

  const denied = await guardPerm(admin, 'agency.manage')
  if (denied) return denied

  const body = await req.json()
  const { agencyId, action, ...data } = body
  const ip = getAuditIp(req)

  if (!agencyId) {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'agencyId gerekli' } }, { status: 400 })
  }

  const agency = await prisma.agency.findUnique({ where: { id: agencyId } })
  if (!agency) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ajans bulunamadı' } }, { status: 404 })
  }

  if (action === 'approve') {
    await prisma.agency.update({ where: { id: agencyId }, data: { status: 'approved', approvedAt: new Date() } })
    // Auto-add owner as member if not already
    const existingMembership = await prisma.agencyUser.findUnique({ where: { userId: agency.ownerId } })
    if (!existingMembership) {
      await prisma.agencyUser.create({ data: { agencyId, userId: agency.ownerId, role: 'owner', joinedVia: 'direct' } })
      await prisma.agency.update({ where: { id: agencyId }, data: { totalMembers: 1, activeMembers: 1 } })
    }
    recordAudit({ actorId: admin.id, action: 'agency_approve', targetType: 'agency', targetId: agencyId, ip }).catch(() => {})
    return NextResponse.json({ success: true, message: 'Ajans onaylandı' })
  }

  if (action === 'reject') {
    await prisma.agency.update({ where: { id: agencyId }, data: { status: 'rejected', rejectedAt: new Date(), rejectedReason: data.reason || null } })
    recordAudit({ actorId: admin.id, action: 'agency_reject', targetType: 'agency', targetId: agencyId, metadata: { reason: data.reason }, ip }).catch(() => {})
    return NextResponse.json({ success: true, message: 'Ajans reddedildi' })
  }

  if (action === 'suspend') {
    await prisma.agency.update({ where: { id: agencyId }, data: { status: 'suspended', suspendedAt: new Date(), penaltyLevel: 4 } })
    await prisma.agencyPenalty.create({
      data: { agencyId, level: 4, reason: data.reason || 'Admin tarafından askıya alındı', appliedBy: admin.id },
    })
    recordAudit({ actorId: admin.id, action: 'agency_suspend', targetType: 'agency', targetId: agencyId, metadata: { reason: data.reason }, ip }).catch(() => {})
    return NextResponse.json({ success: true, message: 'Ajans askıya alındı' })
  }

  if (action === 'reactivate') {
    await prisma.agency.update({
      where: { id: agencyId },
      data: { status: 'approved', penaltyLevel: 0, invitesDisabled: false, suspendedAt: null, penaltyNote: null },
    })
    await prisma.agencyPenalty.updateMany({
      where: { agencyId, isActive: true },
      data: { isActive: false, resolvedAt: new Date(), resolvedBy: admin.id, resolvedNote: 'Admin tarafından yeniden aktif edildi' },
    })
    recordAudit({ actorId: admin.id, action: 'agency_reactivate', targetType: 'agency', targetId: agencyId, ip }).catch(() => {})
    return NextResponse.json({ success: true, message: 'Ajans yeniden aktif edildi' })
  }

  if (action === 'penalty') {
    const level = data.penaltyLevel || 1
    const updateData: any = { penaltyLevel: level, penaltyNote: data.reason }
    if (level >= 2) updateData.invitesDisabled = true
    if (level >= 4) updateData.status = 'suspended'

    await prisma.agency.update({ where: { id: agencyId }, data: updateData })
    await prisma.agencyPenalty.create({
      data: { agencyId, level, reason: data.reason || `Seviye ${level} ceza uygulandı`, appliedBy: admin.id },
    })
    recordAudit({ actorId: admin.id, action: 'agency_penalty', targetType: 'agency', targetId: agencyId, metadata: { level, reason: data.reason }, ip }).catch(() => {})
    return NextResponse.json({ success: true, message: `Seviye ${level} ceza uygulandı` })
  }

  if (action === 'update') {
    const updateData: any = {}
    if (data.commissionRate !== undefined) updateData.commissionRate = parseFloat(data.commissionRate)
    if (data.name) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl

    await prisma.agency.update({ where: { id: agencyId }, data: updateData })
    recordAudit({ actorId: admin.id, action: 'agency_update', targetType: 'agency', targetId: agencyId, metadata: { changes: Object.keys(updateData) }, ip }).catch(() => {})
    return NextResponse.json({ success: true, message: 'Ajans güncellendi' })
  }

  return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: `Geçersiz işlem: ${action}` } }, { status: 400 })
}

// DELETE: Delete agency
export async function DELETE(req: NextRequest) {
  const admin = await resolveUser(req)
  if (!admin || !isAdminRole(admin.role)) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Yetkisiz' } }, { status: 403 })
  }

  const denied = await guardPerm(admin, 'agency.manage')
  if (denied) return denied

  const { agencyId } = await req.json()
  const ip = getAuditIp(req)

  if (!agencyId) {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'agencyId gerekli' } }, { status: 400 })
  }

  await prisma.agency.delete({ where: { id: agencyId } })

  recordAudit({ actorId: admin.id, action: 'agency_delete', targetType: 'agency', targetId: agencyId, ip }).catch(() => {})

  return NextResponse.json({ success: true, message: 'Ajans silindi' })
}
