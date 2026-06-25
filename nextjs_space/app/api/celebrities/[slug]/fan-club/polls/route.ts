import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

// GET polls for a fan club
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const authUser = await authenticateRequest(req)
    const celebrity = await prisma.celebrity.findUnique({ where: { slug: params.slug } })
    if (!celebrity) return NextResponse.json({ error: 'Ünlü bulunamadı' }, { status: 404 })

    const fanClub = await prisma.fanClub.findUnique({ where: { celebrityId: celebrity.id } })
    if (!fanClub) return NextResponse.json({ polls: [] })

    const polls = await prisma.fanClubPoll.findMany({
      where: { fanClubId: fanClub.id, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, name: true, image: true } },
        votes: true,
      },
    })

    const userId = authUser?.id
    const formatted = polls.map(poll => {
      const options = (poll.options as any[]) || []
      const voteCounts = options.map((_: any, i: number) => 
        poll.votes.filter(v => v.optionIndex === i).length
      )
      const totalVotes = poll.votes.length
      const userVote = userId ? poll.votes.find(v => v.userId === userId) : null

      return {
        id: poll.id,
        question: poll.question,
        options: options.map((opt: any, i: number) => ({
          text: opt.text,
          votes: voteCounts[i],
          percentage: totalVotes > 0 ? Math.round((voteCounts[i] / totalVotes) * 100) : 0,
        })),
        totalVotes,
        userVote: userVote ? userVote.optionIndex : null,
        user: poll.user,
        createdAt: poll.createdAt.toISOString(),
        endsAt: poll.endsAt?.toISOString() || null,
      }
    })

    return NextResponse.json({ polls: formatted })
  } catch (e) {
    console.error('Poll fetch error:', e)
    return NextResponse.json({ error: 'Anketler alınamadı' }, { status: 500 })
  }
}

// POST create a poll or vote on a poll
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const celebrity = await prisma.celebrity.findUnique({ where: { slug: params.slug } })
    if (!celebrity) return NextResponse.json({ error: 'Ünlü bulunamadı' }, { status: 404 })

    const fanClub = await prisma.fanClub.findUnique({ where: { celebrityId: celebrity.id } })
    if (!fanClub) return NextResponse.json({ error: 'Fan kulübü bulunamadı' }, { status: 404 })

    // Check membership
    const membership = await prisma.fanClubMember.findUnique({
      where: { fanClubId_userId: { fanClubId: fanClub.id, userId: authUser.id } }
    })
    if (!membership) return NextResponse.json({ error: 'Fan kulübüne üye olmalısınız' }, { status: 403 })

    const body = await req.json()

    // Vote on existing poll
    if (body.pollId && body.optionIndex !== undefined) {
      const poll = await prisma.fanClubPoll.findUnique({ where: { id: body.pollId } })
      if (!poll || !poll.isActive) return NextResponse.json({ error: 'Anket bulunamadı' }, { status: 404 })
      if (poll.endsAt && new Date(poll.endsAt) < new Date()) {
        return NextResponse.json({ error: 'Anket süresi dolmuş' }, { status: 400 })
      }

      const options = (poll.options as any[]) || []
      if (body.optionIndex < 0 || body.optionIndex >= options.length) {
        return NextResponse.json({ error: 'Geçersiz seçenek' }, { status: 400 })
      }

      // Check if already voted
      const existing = await prisma.fanClubPollVote.findUnique({
        where: { pollId_userId: { pollId: body.pollId, userId: authUser.id } }
      })
      if (existing) return NextResponse.json({ error: 'Zaten oy verdiniz' }, { status: 400 })

      await prisma.fanClubPollVote.create({
        data: {
          pollId: body.pollId,
          userId: authUser.id,
          optionIndex: body.optionIndex,
        }
      })

      // Award XP for voting
      await prisma.fanClubMember.update({
        where: { fanClubId_userId: { fanClubId: fanClub.id, userId: authUser.id } },
        data: { xp: { increment: 5 } },
      })

      return NextResponse.json({ success: true })
    }

    // Create new poll
    if (body.question && body.options) {
      if (!body.question.trim()) return NextResponse.json({ error: 'Soru boş olamaz' }, { status: 400 })
      if (!Array.isArray(body.options) || body.options.length < 2 || body.options.length > 6) {
        return NextResponse.json({ error: '2-6 arası seçenek ekleyin' }, { status: 400 })
      }

      const poll = await prisma.fanClubPoll.create({
        data: {
          fanClubId: fanClub.id,
          userId: authUser.id,
          question: body.question.trim(),
          options: body.options.map((o: string) => ({ text: o.trim() })),
          endsAt: body.endsAt ? new Date(body.endsAt) : null,
        },
      })

      // Award XP for creating a poll
      await prisma.fanClubMember.update({
        where: { fanClubId_userId: { fanClubId: fanClub.id, userId: authUser.id } },
        data: { xp: { increment: 15 } },
      })

      return NextResponse.json({ poll: { id: poll.id } })
    }

    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  } catch (e) {
    console.error('Poll action error:', e)
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 })
  }
}
