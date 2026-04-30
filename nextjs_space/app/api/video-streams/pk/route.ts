export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// GET - Get active PK battle for a stream
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const streamId = searchParams.get('streamId')
    if (!streamId) return NextResponse.json({ error: 'streamId gerekli' }, { status: 400 })

    // Include recently completed battles (last 5 min) so PK result screen stays visible
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    const battle = await prisma.pKBattle.findFirst({
      where: {
        AND: [
          { OR: [{ stream1Id: streamId }, { stream2Id: streamId }] },
          { OR: [
            { status: { in: ['pending', 'active'] } },
            { status: 'completed', endedAt: { gte: fiveMinAgo } }
          ]}
        ]
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!battle) return NextResponse.json(null)

    // Fetch user info for both sides
    const [user1, user2, stream1, stream2] = await Promise.all([
      prisma.user.findUnique({ where: { id: battle.user1Id }, select: { id: true, name: true, image: true } }),
      prisma.user.findUnique({ where: { id: battle.user2Id }, select: { id: true, name: true, image: true } }),
      prisma.videoStream.findUnique({ where: { id: battle.stream1Id }, select: { id: true, title: true } }),
      prisma.videoStream.findUnique({ where: { id: battle.stream2Id }, select: { id: true, title: true } })
    ])

    return NextResponse.json({
      ...battle,
      user1,
      user2,
      stream1,
      stream2
    })
  } catch (e) {
    console.error('PK GET error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// POST - Create PK battle request or accept/reject/cancel
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const body = await req.json()
    const { action, streamId, targetStreamId, battleId, duration } = body

    if (action === 'create') {
      // Create a new PK battle request
      if (!streamId || !targetStreamId) {
        return NextResponse.json({ error: 'streamId ve targetStreamId gerekli' }, { status: 400 })
      }

      // Check streams are live
      const [myStream, targetStream] = await Promise.all([
        prisma.videoStream.findFirst({ where: { id: streamId, userId: session.user.id, status: 'live' } }),
        prisma.videoStream.findFirst({ where: { id: targetStreamId, status: 'live' } })
      ])

      if (!myStream) return NextResponse.json({ error: 'Aktif yayınınız bulunamadı' }, { status: 400 })
      if (!targetStream) return NextResponse.json({ error: 'Hedef yayın aktif değil' }, { status: 400 })

      // Check no existing active PK for either stream
      const existingPK = await prisma.pKBattle.findFirst({
        where: {
          OR: [
            { stream1Id: { in: [streamId, targetStreamId] } },
            { stream2Id: { in: [streamId, targetStreamId] } }
          ],
          status: { in: ['pending', 'active'] }
        }
      })

      if (existingPK) return NextResponse.json({ error: 'Zaten aktif bir PK mevcut' }, { status: 400 })

      const battle = await prisma.pKBattle.create({
        data: {
          stream1Id: streamId,
          stream2Id: targetStreamId,
          user1Id: session.user.id,
          user2Id: targetStream.userId,
          duration: duration || 180,
          status: 'pending'
        }
      })

      return NextResponse.json(battle)
    }

    if (action === 'accept') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      
      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })
      if (battle.user2Id !== session.user.id) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      if (battle.status !== 'pending') return NextResponse.json({ error: 'Bu PK zaten kabul edilmiş' }, { status: 400 })

      const updated = await prisma.pKBattle.update({
        where: { id: battleId },
        data: { status: 'active', startedAt: new Date() }
      })

      return NextResponse.json(updated)
    }

    if (action === 'reject' || action === 'cancel') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      
      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })
      
      // Either party can cancel/reject
      if (battle.user1Id !== session.user.id && battle.user2Id !== session.user.id) {
        return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      }

      const updated = await prisma.pKBattle.update({
        where: { id: battleId },
        data: { status: action === 'reject' ? 'rejected' : 'cancelled', endedAt: new Date() }
      })

      return NextResponse.json(updated)
    }

    if (action === 'end') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      
      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })
      if (battle.status !== 'active') return NextResponse.json({ error: 'PK aktif değil' }, { status: 400 })

      const winnerId = battle.score1 > battle.score2 ? battle.user1Id : 
                       battle.score2 > battle.score1 ? battle.user2Id : null

      const updated = await prisma.pKBattle.update({
        where: { id: battleId },
        data: { status: 'completed', endedAt: new Date(), winnerId }
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
  } catch (e) {
    console.error('PK POST error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
