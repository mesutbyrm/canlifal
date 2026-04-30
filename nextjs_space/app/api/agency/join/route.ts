import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { inviteCode } = await req.json()
    if (!inviteCode) {
      return NextResponse.json({ error: 'Davet kodu gereklidir' }, { status: 400 })
    }

    // Check if user is already in an agency
    const existingMember = await prisma.agencyUser.findUnique({
      where: { userId: session.user.id }
    })
    if (existingMember) {
      return NextResponse.json({ error: 'Zaten bir ajansın üyesisiniz. Önce ayrılmanız gerekiyor.' }, { status: 400 })
    }

    // Find invite code
    const code = await prisma.inviteCode.findUnique({
      where: { code: inviteCode.toUpperCase() },
      include: { agency: { select: { id: true, name: true, status: true, invitesDisabled: true } } }
    })

    if (!code || !code.isActive) {
      return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş davet kodu' }, { status: 400 })
    }

    if (code.agency.status !== 'approved') {
      return NextResponse.json({ error: 'Bu ajans aktif değil' }, { status: 400 })
    }

    if (code.agency.invitesDisabled) {
      return NextResponse.json({ error: 'Bu ajansın davet sistemi devre dışı bırakılmış' }, { status: 400 })
    }

    if (code.expiresAt && code.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Davet kodunun süresi dolmuş' }, { status: 400 })
    }

    if (code.maxUses > 0 && code.usedCount >= code.maxUses) {
      return NextResponse.json({ error: 'Bu davet kodu kullanım limitine ulaşmış' }, { status: 400 })
    }

    // Get IP for fraud detection
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null

    // Create membership
    const membership = await prisma.agencyUser.create({
      data: {
        agencyId: code.agencyId,
        userId: session.user.id,
        role: 'member',
        joinedVia: 'invite_code',
        inviteCodeId: code.id,
        joinIp: ip,
      }
    })

    // Increment invite code usage and agency member count
    await prisma.inviteCode.update({
      where: { id: code.id },
      data: { usedCount: { increment: 1 } }
    })
    await prisma.agency.update({
      where: { id: code.agencyId },
      data: { totalMembers: { increment: 1 }, activeMembers: { increment: 1 } }
    })

    return NextResponse.json({
      success: true,
      message: `${code.agency.name} ajansına başarıyla katıldınız!`,
      agencyName: code.agency.name
    })
  } catch (error: any) {
    console.error('[Agency Join] Error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Zaten bir ajansın üyesisiniz' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Katılım sırasında hata oluştu' }, { status: 500 })
  }
}
