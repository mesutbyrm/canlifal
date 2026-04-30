import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Create invite code
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { maxUses, expiresInDays } = await req.json()

    // Check user's agency ownership/management
    const membership = await prisma.agencyUser.findUnique({
      where: { userId: session.user.id },
      include: { agency: { select: { id: true, status: true, invitesDisabled: true } } }
    })

    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      return NextResponse.json({ error: 'Bu işlem için ajans sahibi veya yönetici olmalısınız' }, { status: 403 })
    }

    if (membership.agency.status !== 'approved') {
      return NextResponse.json({ error: 'Ajansınız henüz onaylanmamış' }, { status: 400 })
    }

    if (membership.agency.invitesDisabled) {
      return NextResponse.json({ error: 'Davet sistemi ceza nedeniyle devre dışı bırakılmış' }, { status: 400 })
    }

    let code = generateCode()
    // Ensure uniqueness
    let attempts = 0
    while (await prisma.inviteCode.findUnique({ where: { code } })) {
      code = generateCode()
      attempts++
      if (attempts > 10) break
    }

    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null

    const inviteCode = await prisma.inviteCode.create({
      data: {
        agencyId: membership.agencyId,
        code,
        createdById: session.user.id,
        maxUses: maxUses || 0,
        expiresAt,
      }
    })

    return NextResponse.json({ success: true, inviteCode })
  } catch (error: any) {
    console.error('[Agency Invite] Error:', error)
    return NextResponse.json({ error: 'Davet kodu oluşturulamadı' }, { status: 500 })
  }
}

// Get invite codes for agency
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const membership = await prisma.agencyUser.findUnique({
      where: { userId: session.user.id },
    })

    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const codes = await prisma.inviteCode.findMany({
      where: { agencyId: membership.agencyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ codes })
  } catch (error: any) {
    console.error('[Agency Invite GET] Error:', error)
    return NextResponse.json({ error: 'Kodlar alınamadı' }, { status: 500 })
  }
}
