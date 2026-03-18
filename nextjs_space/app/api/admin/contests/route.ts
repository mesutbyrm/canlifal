import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contests = await prisma.dreamContest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { entries: true } }
      }
    })

    return NextResponse.json({ contests })
  } catch (error) {
    console.error('Admin contests fetch error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, dreamPrompt, startDate, endDate } = body

    if (!title || !dreamPrompt || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const contest = await prisma.dreamContest.create({
      data: {
        title,
        description: description || '',
        dreamPrompt,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true
      }
    })

    return NextResponse.json({ contest })
  } catch (error) {
    console.error('Admin contest create error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, title, description, dreamPrompt, startDate, endDate, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing contest id' }, { status: 400 })
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (dreamPrompt !== undefined) updateData.dreamPrompt = dreamPrompt
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = new Date(endDate)
    if (isActive !== undefined) updateData.isActive = isActive

    const contest = await prisma.dreamContest.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ contest })
  } catch (error) {
    console.error('Admin contest update error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // Delete entries and votes first
    const entries = await prisma.dreamContestEntry.findMany({ where: { contestId: id } })
    for (const entry of entries) {
      await prisma.dreamContestVote.deleteMany({ where: { entryId: entry.id } })
    }
    await prisma.dreamContestEntry.deleteMany({ where: { contestId: id } })
    await prisma.dreamContest.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin contest delete error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
