import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { requireFeature } from '@/lib/check-feature'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const agencyBlocked = await requireFeature('AGENCY_ENABLED')
    if (agencyBlocked) return agencyBlocked

    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { name, description, contactEmail, contactPhone } = await req.json()

    if (!name || name.trim().length < 3) {
      return NextResponse.json({ error: 'Ajans adı en az 3 karakter olmalıdır' }, { status: 400 })
    }

    // Check if user already owns an agency
    const existingOwner = await prisma.agency.findFirst({
      where: { ownerId: authUser.id, status: { in: ['pending', 'approved'] } }
    })
    if (existingOwner) {
      return NextResponse.json({ error: 'Zaten bir ajans başvurunuz veya aktif ajansınız var' }, { status: 400 })
    }

    // Check if user is already in an agency
    const existingMember = await prisma.agencyUser.findUnique({
      where: { userId: authUser.id }
    })
    if (existingMember) {
      return NextResponse.json({ error: 'Başka bir ajansın üyesiyken ajans kuramazsınız' }, { status: 400 })
    }

    // Check name uniqueness
    const nameTaken = await prisma.agency.findUnique({ where: { name: name.trim() } })
    if (nameTaken) {
      return NextResponse.json({ error: 'Bu ajans adı zaten kullanılıyor' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: authUser.id }, select: { name: true } })

    const agency = await prisma.agency.create({
      data: {
        name: name.trim(),
        description: description || null,
        ownerId: authUser.id,
        ownerName: user?.name || 'Kullanıcı',
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        status: 'pending',
      }
    })

    return NextResponse.json({ success: true, agency, message: 'Ajans başvurunuz alındı. Admin onayı bekleniyor.' })
  } catch (error: any) {
    console.error('[Agency Apply] Error:', error)
    return NextResponse.json({ error: 'Başvuru sırasında hata oluştu' }, { status: 500 })
  }
}
