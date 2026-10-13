import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/rbac'
import { recordAudit } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9ğüşıöç]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36)
}

/* ───── GET: Yarışmaları listele ───── */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'contest.manage')
  if (auth instanceof NextResponse) return auth

  const sp = req.nextUrl.searchParams
  const status = sp.get('status') || undefined
  const type = sp.get('type') || undefined
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '20')))

  const where: any = {}
  if (status) where.status = status
  if (type) where.type = type

  const [contests, total] = await Promise.all([
    prisma.cfcContest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        season: { select: { id: true, name: true } },
        _count: { select: { participants: true, teams: true, scoreLogs: true } },
      },
    }),
    prisma.cfcContest.count({ where }),
  ])

  const seasons = await prisma.cfcSeason.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })

  return NextResponse.json({ success: true, data: { contests, total, page, limit, seasons } })
}

/* ───── POST: Yarışma işlemleri ───── */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'contest.manage')
  if (auth instanceof NextResponse) return auth
  const admin = (auth as any).user

  const body = await req.json()
  const { action } = body

  // ── CREATE ──
  if (action === 'create') {
    const { name, type, scope, description, scoringMetrics, commissionRate, rules, minParticipants, maxParticipants, entryRequirements, startsAt, endsAt, registrationEndsAt, rewards, seasonId, isPublic, isFeatured, bannerImage } = body
    if (!name || !type || !scoringMetrics) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'İsim, tür ve puanlama metrikleri gerekli' } }, { status: 400 })
    }
    const contest = await prisma.cfcContest.create({
      data: {
        name, slug: slug(name), type, scope: scope || 'general', description,
        scoringMetrics: typeof scoringMetrics === 'string' ? scoringMetrics : JSON.stringify(scoringMetrics),
        commissionRate: commissionRate != null ? parseFloat(commissionRate) : null,
        rules: rules ? (typeof rules === 'string' ? rules : JSON.stringify(rules)) : null,
        minParticipants: minParticipants || 2,
        maxParticipants: maxParticipants || null,
        entryRequirements: entryRequirements ? (typeof entryRequirements === 'string' ? entryRequirements : JSON.stringify(entryRequirements)) : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        registrationEndsAt: registrationEndsAt ? new Date(registrationEndsAt) : null,
        rewards: rewards ? (typeof rewards === 'string' ? rewards : JSON.stringify(rewards)) : null,
        seasonId: seasonId || null,
        isPublic: isPublic !== false,
        isFeatured: isFeatured === true,
        bannerImage: bannerImage || null,
        createdBy: admin.id,
      },
    })
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: 'contest_create', targetType: 'CfcContest', targetId: contest.id, description: `Yarışma oluşturuldu: ${name}` })
    return NextResponse.json({ success: true, data: contest }, { status: 201 })
  }

  // ── STATUS CHANGE ──
  const statusActions = ['start', 'pause', 'freeze', 'resume', 'complete', 'cancel'] as const
  type StatusAction = typeof statusActions[number]
  const statusMap: Record<string, { to: string; from: string[] }> = {
    start:    { to: 'active',    from: ['draft', 'scheduled'] },
    pause:    { to: 'paused',    from: ['active'] },
    freeze:   { to: 'frozen',    from: ['active', 'paused'] },
    resume:   { to: 'active',    from: ['paused', 'frozen'] },
    complete: { to: 'completed', from: ['active', 'paused', 'frozen'] },
    cancel:   { to: 'cancelled', from: ['draft', 'scheduled', 'active', 'paused', 'frozen'] },
  }
  if ((statusActions as readonly string[]).includes(action)) {
    const { contestId } = body
    if (!contestId) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'contestId gerekli' } }, { status: 400 })
    const contest = await prisma.cfcContest.findUnique({ where: { id: contestId }, select: { id: true, name: true, status: true } })
    if (!contest) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Yarışma bulunamadı' } }, { status: 404 })
    const rule = statusMap[action]
    if (!rule.from.includes(contest.status)) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_STATE', message: `Bu işlem '${contest.status}' durumunda yapılamaz` } }, { status: 409 })
    }
    await prisma.cfcContest.update({ where: { id: contestId }, data: { status: rule.to } })
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: `contest_${action}`, targetType: 'CfcContest', targetId: contestId, description: `Yarışma durumu değişti: ${contest.name} → ${rule.to}` })
    return NextResponse.json({ success: true, message: `Yarışma ${rule.to} durumuna alındı` })
  }

  // ── UPDATE ──
  if (action === 'update') {
    const { contestId, ...updates } = body
    if (!contestId) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'contestId gerekli' } }, { status: 400 })
    const allowedFields = ['name', 'description', 'scoringMetrics', 'commissionRate', 'rules', 'minParticipants', 'maxParticipants', 'entryRequirements', 'startsAt', 'endsAt', 'registrationEndsAt', 'rewards', 'seasonId', 'isPublic', 'isFeatured', 'bannerImage']
    const data: any = {}
    for (const k of allowedFields) {
      if (updates[k] !== undefined) {
        if (['scoringMetrics', 'rules', 'entryRequirements', 'rewards'].includes(k) && typeof updates[k] !== 'string') {
          data[k] = JSON.stringify(updates[k])
        } else if (['startsAt', 'endsAt', 'registrationEndsAt'].includes(k)) {
          data[k] = updates[k] ? new Date(updates[k]) : null
        } else if (k === 'commissionRate') {
          data[k] = updates[k] != null ? parseFloat(updates[k]) : null
        } else {
          data[k] = updates[k]
        }
      }
    }
    await prisma.cfcContest.update({ where: { id: contestId }, data })
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: 'contest_update', targetType: 'CfcContest', targetId: contestId, description: 'Yarışma güncellendi' })
    return NextResponse.json({ success: true, message: 'Yarışma güncellendi' })
  }

  // ── ADD PARTICIPANT ──
  if (action === 'add_participant') {
    const { contestId, userId, agencyId, roomId, teamId, displayName } = body
    if (!contestId) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'contestId gerekli' } }, { status: 400 })
    if (!userId && !agencyId && !roomId) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'userId, agencyId veya roomId gerekli' } }, { status: 400 })
    const contest = await prisma.cfcContest.findUnique({ where: { id: contestId }, select: { maxParticipants: true, _count: { select: { participants: true } } } })
    if (!contest) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Yarışma bulunamadı' } }, { status: 404 })
    if (contest.maxParticipants && (contest as any)._count.participants >= contest.maxParticipants) {
      return NextResponse.json({ success: false, error: { code: 'FULL', message: 'Yarışma katılımcı sınırına ulaştı' } }, { status: 409 })
    }
    try {
      await prisma.cfcParticipant.create({ data: { contestId, userId: userId || null, agencyId: agencyId || null, roomId: roomId || null, teamId: teamId || null, displayName: displayName || null } })
    } catch (e: any) {
      if (e.code === 'P2002') return NextResponse.json({ success: false, error: { code: 'DUPLICATE', message: 'Bu katılımcı zaten yarışmada' } }, { status: 409 })
      throw e
    }
    return NextResponse.json({ success: true, message: 'Katılımcı eklendi' })
  }

  // ── REMOVE PARTICIPANT ──
  if (action === 'remove_participant') {
    const { participantId, contestId, userId } = body
    if (participantId) {
      await prisma.cfcParticipant.delete({ where: { id: participantId } })
    } else if (contestId && userId) {
      await prisma.cfcParticipant.delete({ where: { contestId_userId: { contestId, userId } } })
    } else {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'participantId veya contestId+userId gerekli' } }, { status: 400 })
    }
    return NextResponse.json({ success: true, message: 'Katılımcı çıkarıldı' })
  }

  // ── DISQUALIFY ──
  if (action === 'disqualify') {
    const { participantId } = body
    if (!participantId) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'participantId gerekli' } }, { status: 400 })
    await prisma.cfcParticipant.update({ where: { id: participantId }, data: { status: 'disqualified' } })
    return NextResponse.json({ success: true, message: 'Katılımcı diskalifiye edildi' })
  }

  // ── CREATE TEAM ──
  if (action === 'create_team') {
    const { contestId, name, color, badgeEmoji, captainId } = body
    if (!contestId || !name) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'contestId ve takım adı gerekli' } }, { status: 400 })
    const team = await prisma.cfcTeam.create({ data: { contestId, name, color: color || null, badgeEmoji: badgeEmoji || null, captainId: captainId || null } })
    return NextResponse.json({ success: true, data: team }, { status: 201 })
  }

  // ── ASSIGN TEAM ──
  if (action === 'assign_team') {
    const { participantId, teamId } = body
    if (!participantId) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'participantId gerekli' } }, { status: 400 })
    await prisma.cfcParticipant.update({ where: { id: participantId }, data: { teamId: teamId || null } })
    return NextResponse.json({ success: true, message: 'Takım atandı' })
  }

  // ── RECALCULATE SCORES ──
  if (action === 'recalculate') {
    const { contestId } = body
    if (!contestId) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'contestId gerekli' } }, { status: 400 })
    // Aggregate score logs
    const participants = await prisma.cfcParticipant.findMany({ where: { contestId, status: 'active' }, select: { id: true, userId: true, agencyId: true, roomId: true } })
    for (const p of participants) {
      const agg = await prisma.cfcScoreLog.aggregate({ where: { contestId, userId: p.userId, agencyId: p.agencyId, roomId: p.roomId }, _sum: { delta: true } })
      await prisma.cfcParticipant.update({ where: { id: p.id }, data: { score: agg._sum.delta || 0 } })
    }
    // Rank
    const ranked = await prisma.cfcParticipant.findMany({ where: { contestId, status: 'active' }, orderBy: { score: 'desc' }, select: { id: true } })
    for (let i = 0; i < ranked.length; i++) {
      await prisma.cfcParticipant.update({ where: { id: ranked[i].id }, data: { rank: i + 1 } })
    }
    // Team scores
    const teams = await prisma.cfcTeam.findMany({ where: { contestId }, select: { id: true } })
    for (const t of teams) {
      const teamAgg = await prisma.cfcParticipant.aggregate({ where: { teamId: t.id, status: 'active' }, _sum: { score: true } })
      await prisma.cfcTeam.update({ where: { id: t.id }, data: { totalScore: teamAgg._sum.score || 0 } })
    }
    const teamRanked = await prisma.cfcTeam.findMany({ where: { contestId }, orderBy: { totalScore: 'desc' }, select: { id: true } })
    for (let i = 0; i < teamRanked.length; i++) {
      await prisma.cfcTeam.update({ where: { id: teamRanked[i].id }, data: { rank: i + 1 } })
    }
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: 'contest_recalculate', targetType: 'CfcContest', targetId: contestId, description: 'Yarışma skorları yeniden hesaplandı' })
    return NextResponse.json({ success: true, message: `${participants.length} katılımcı skoru güncellendi` })
  }

  // ── SEASON CRUD ──
  if (action === 'create_season') {
    const { name, description, startsAt, endsAt } = body
    if (!name) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'Sezon adı gerekli' } }, { status: 400 })
    const season = await prisma.cfcSeason.create({ data: { name, slug: slug(name), description: description || null, startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null } })
    return NextResponse.json({ success: true, data: season }, { status: 201 })
  }

  if (action === 'toggle_season') {
    const { seasonId, isActive } = body
    if (!seasonId) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'seasonId gerekli' } }, { status: 400 })
    await prisma.cfcSeason.update({ where: { id: seasonId }, data: { isActive: isActive === true } })
    return NextResponse.json({ success: true, message: 'Sezon güncellendi' })
  }

  // ── PUBLISH RESULTS ──
  if (action === 'publish_results') {
    const { contestId } = body
    if (!contestId) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'contestId gerekli' } }, { status: 400 })
    const contest = await prisma.cfcContest.findUnique({ where: { id: contestId }, select: { id: true, name: true, rewards: true, status: true } })
    if (!contest) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Yarışma bulunamadı' } }, { status: 404 })
    // Auto-complete if still active
    if (['active', 'paused', 'frozen'].includes(contest.status)) {
      await prisma.cfcContest.update({ where: { id: contestId }, data: { status: 'completed' } })
    }
    const topParticipants = await prisma.cfcParticipant.findMany({ where: { contestId, status: 'active' }, orderBy: { rank: 'asc' }, take: 10, select: { id: true, userId: true, displayName: true, score: true, rank: true } })
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: 'contest_publish', targetType: 'CfcContest', targetId: contestId, description: `Yarışma sonuçları yayınlandı: ${contest.name}` })
    return NextResponse.json({ success: true, data: { contest: { ...contest, status: 'completed' }, results: topParticipants } })
  }

  return NextResponse.json({ success: false, error: { code: 'UNKNOWN_ACTION', message: `Bilinmeyen işlem: ${action}` } }, { status: 400 })
}
