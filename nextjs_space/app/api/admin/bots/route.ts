export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export async function GET(req: NextRequest) {
  try {
    const session = await getHybridSession(req)
    if (!session?.user?.role || !(await staffCan(session.user.role, (session?.user as any)?.id, 'system.config.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const personality = searchParams.get('personality')
    const active = searchParams.get('active')
    const search = searchParams.get('search')

    const where: any = { isBot: true }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ]
    }

    const botProfileWhere: any = {}
    if (personality) botProfileWhere.personality = personality
    if (active !== null && active !== '') botProfileWhere.isActive = active === 'true'
    if (Object.keys(botProfileWhere).length > 0) {
      where.botProfile = botProfileWhere
    }

    const bots = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        zodiacSign: true,
        createdAt: true,
        lastActiveAt: true,
        botProfile: {
          select: {
            id: true,
            personality: true,
            age: true,
            city: true,
            interests: true,
            activityLevel: true,
            activeHoursStart: true,
            activeHoursEnd: true,
            isActive: true,
            lastActionAt: true,
            totalActions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Stats
    const totalBots = bots.length
    const activeBots = bots.filter(b => b.botProfile?.isActive).length
    const personalityStats = bots.reduce((acc: Record<string, number>, b) => {
      const p = b.botProfile?.personality || 'unknown'
      acc[p] = (acc[p] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      bots,
      stats: { total: totalBots, active: activeBots, personalityStats }
    })
  } catch (error) {
    console.error('Bot list error:', error)
    return NextResponse.json({ error: 'Botlar yüklenemedi' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getHybridSession(req)
    if (!session?.user?.role || !(await staffCan(session.user.role, (session?.user as any)?.id, 'system.config.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const { action, botIds, personality, activityLevel, isActive } = body

    if (action === 'toggle_active' && botIds?.length) {
      await prisma.botProfile.updateMany({
        where: { userId: { in: botIds } },
        data: { isActive: isActive ?? false }
      })
      return NextResponse.json({ success: true, message: `${botIds.length} bot güncellendi` })
    }

    if (action === 'toggle_all') {
      await prisma.botProfile.updateMany({
        data: { isActive: isActive ?? false }
      })
      return NextResponse.json({ success: true, message: `Tüm botlar ${isActive ? 'aktif' : 'pasif'} edildi` })
    }

    if (action === 'update_profile' && botIds?.length === 1) {
      const data: any = {}
      if (personality) data.personality = personality
      if (activityLevel) data.activityLevel = activityLevel
      if (isActive !== undefined) data.isActive = isActive

      await prisma.botProfile.update({
        where: { userId: botIds[0] },
        data
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (error) {
    console.error('Bot update error:', error)
    return NextResponse.json({ error: 'Bot güncellenemedi' }, { status: 500 })
  }
}
