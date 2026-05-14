import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

const FAN_LEVELS = [
  { key: 'yeni_fan', label: 'Yeni Fan', emoji: '🌱', minXp: 0, color: 'from-gray-400 to-gray-600' },
  { key: 'aktif_fan', label: 'Aktif Fan', emoji: '⭐', minXp: 50, color: 'from-blue-400 to-blue-600' },
  { key: 'super_fan', label: 'Süper Fan', emoji: '🔥', minXp: 200, color: 'from-orange-400 to-red-500' },
  { key: 'vip_fan', label: 'VIP Fan', emoji: '💎', minXp: 500, color: 'from-purple-400 to-fuchsia-600' },
  { key: 'efsane_fan', label: 'Efsane Fan', emoji: '👑', minXp: 1000, color: 'from-yellow-400 to-amber-600' },
]

function calculateLevel(xp: number) {
  let current = FAN_LEVELS[0]
  let next = FAN_LEVELS[1] || null
  for (let i = FAN_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= FAN_LEVELS[i].minXp) {
      current = FAN_LEVELS[i]
      next = FAN_LEVELS[i + 1] || null
      break
    }
  }
  const progress = next ? Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)) : 100
  return { ...current, xp, progress, next }
}

// GET fan level info
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const celebrity = await prisma.celebrity.findUnique({ where: { slug: params.slug } })
    if (!celebrity) return NextResponse.json({ error: 'Ünlü bulunamadı' }, { status: 404 })

    const fanClub = await prisma.fanClub.findUnique({ where: { celebrityId: celebrity.id } })
    if (!fanClub) return NextResponse.json({ error: 'Fan kulübü bulunamadı' }, { status: 404 })

    const membership = await prisma.fanClubMember.findUnique({
      where: { fanClubId_userId: { fanClubId: fanClub.id, userId: session.user.id } }
    })
    if (!membership) return NextResponse.json({ error: 'Üye değilsiniz' }, { status: 403 })

    // Auto-update level based on XP
    const levelInfo = calculateLevel(membership.xp)
    if (membership.level !== levelInfo.key) {
      await prisma.fanClubMember.update({
        where: { id: membership.id },
        data: { level: levelInfo.key },
      })
    }

    return NextResponse.json({
      level: levelInfo,
      allLevels: FAN_LEVELS,
    })
  } catch (e) {
    console.error('Level fetch error:', e)
    return NextResponse.json({ error: 'Seviye bilgisi alınamadı' }, { status: 500 })
  }
}
