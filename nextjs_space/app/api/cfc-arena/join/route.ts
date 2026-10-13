import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

/* Kullanıcı yarışmaya katılma */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as any).user

  const { contestId } = await req.json()
  if (!contestId) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'contestId gerekli' } }, { status: 400 })

  const contest = await prisma.cfcContest.findUnique({
    where: { id: contestId },
    select: { id: true, status: true, type: true, maxParticipants: true, registrationEndsAt: true, entryRequirements: true, _count: { select: { participants: true } } },
  })
  if (!contest) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Yarışma bulunamadı' } }, { status: 404 })
  if (!['active', 'scheduled'].includes(contest.status)) return NextResponse.json({ success: false, error: { code: 'CLOSED', message: 'Yarışma katılıma kapalı' } }, { status: 409 })
  if (contest.registrationEndsAt && new Date() > contest.registrationEndsAt) return NextResponse.json({ success: false, error: { code: 'CLOSED', message: 'Kayıt süresi doldu' } }, { status: 409 })
  if (contest.maxParticipants && (contest as any)._count.participants >= contest.maxParticipants) return NextResponse.json({ success: false, error: { code: 'FULL', message: 'Yarışma dolu' } }, { status: 409 })

  // Check entry requirements
  if (contest.entryRequirements) {
    try {
      const reqs = JSON.parse(contest.entryRequirements)
      if (reqs.mustBeStreamer && !user.canBroadcast) return NextResponse.json({ success: false, error: { code: 'REQUIREMENT', message: 'Yayıncı olmanız gerekiyor' } }, { status: 403 })
    } catch { /* skip */ }
  }

  try {
    await prisma.cfcParticipant.create({ data: { contestId, userId: user.id, displayName: user.name || user.username || null } })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ success: false, error: { code: 'ALREADY_JOINED', message: 'Zaten katıldınız' } }, { status: 409 })
    throw e
  }

  return NextResponse.json({ success: true, message: 'Yarışmaya katıldınız!' })
}
