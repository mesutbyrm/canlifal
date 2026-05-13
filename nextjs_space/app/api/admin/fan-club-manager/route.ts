import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator']

async function isAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return false
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  return user && ADMIN_ROLES.includes(user.role || '')
}

// Assign or remove a manager for a fan club
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  try {
    const { fanClubId, userId, action } = await req.json()
    if (!fanClubId || !userId) {
      return NextResponse.json({ error: 'fanClubId ve userId gerekli' }, { status: 400 })
    }

    if (action === 'remove') {
      // Demote to member
      await prisma.fanClubMember.updateMany({
        where: { fanClubId, userId },
        data: { role: 'member' },
      })
      return NextResponse.json({ success: true, message: 'Yönetici kaldırıldı' })
    }

    // Check if user is already a member
    const existingMember = await prisma.fanClubMember.findUnique({
      where: { fanClubId_userId: { fanClubId, userId } },
    })

    if (existingMember) {
      // Promote to moderator
      await prisma.fanClubMember.update({
        where: { id: existingMember.id },
        data: { role: 'moderator' },
      })
    } else {
      // Add as moderator
      await prisma.fanClubMember.create({
        data: { fanClubId, userId, role: 'moderator' },
      })
    }

    return NextResponse.json({ success: true, message: 'Yönetici atandı' })
  } catch (err) {
    console.error('Fan club manager error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// Get fan club members with roles (for admin panel)
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const fanClubId = searchParams.get('fanClubId')
    if (!fanClubId) return NextResponse.json({ error: 'fanClubId gerekli' }, { status: 400 })

    const members = await prisma.fanClubMember.findMany({
      where: { fanClubId },
      include: {
        user: { select: { id: true, name: true, image: true, email: true } },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ members })
  } catch (err) {
    console.error('Fan club members GET error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
