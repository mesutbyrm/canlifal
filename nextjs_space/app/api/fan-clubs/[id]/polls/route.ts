export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { guardRateLimit } from '@/lib/rate-limit-guard'

/**
 * GET  /api/fan-clubs/:id/polls — kulüp anketleri
 * POST /api/fan-clubs/:id/polls — yeni anket (üye olmalı)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await authenticateRequest(req).catch(() => null)
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 50)

    const polls = await prisma.fanClubPoll.findMany({
      where: { fanClubId: id, isActive: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
        _count: { select: { votes: true } },
        ...(authUser
          ? { votes: { where: { userId: authUser.id }, select: { optionIndex: true }, take: 1 } }
          : {}),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        polls: polls.map((p: any) => {
          const options = Array.isArray(p.options) ? p.options : []
          return {
            id: p.id,
            question: p.question,
            options,
            totalVotes: p._count?.votes ?? 0,
            myVote: authUser && p.votes?.length ? p.votes[0].optionIndex : null,
            endsAt: p.endsAt,
            user: p.user,
            createdAt: p.createdAt,
          }
        }),
      },
    })
  } catch (error: any) {
    console.error('[fan-clubs] polls error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Anketler alınamadı' } },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const rateLimited = await guardRateLimit(req, 'content_create', { userId: authUser.id })
    if (rateLimited) return rateLimited

    const { id } = await params

    const member = await prisma.fanClubMember.findUnique({
      where: { fanClubId_userId: { fanClubId: id, userId: authUser.id } },
    })
    if (!member) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_MEMBER', message: 'Önce fan kulübüne katılmanız gerekiyor' } },
        { status: 403 }
      )
    }

    const body = await req.json()
    const question = (body.question || '').trim()
    const options = Array.isArray(body.options) ? body.options.slice(0, 6) : []
    if (!question || options.length < 2) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION', message: 'Soru ve en az 2 seçenek gereklidir' } },
        { status: 400 }
      )
    }

    const poll = await prisma.fanClubPoll.create({
      data: {
        fanClubId: id,
        userId: authUser.id,
        question,
        options: options.map((o: any) => ({ text: typeof o === 'string' ? o : o.text || '' })),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
      },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: poll.id,
        question: poll.question,
        options: poll.options,
        totalVotes: 0,
        myVote: null,
        endsAt: poll.endsAt,
        user: (poll as any).user,
        createdAt: poll.createdAt,
      },
    })
  } catch (error: any) {
    console.error('[fan-clubs] poll create error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Anket oluşturulamadı' } },
      { status: 500 }
    )
  }
}
