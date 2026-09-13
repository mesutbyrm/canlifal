export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'

/**
 * POST /api/admin/chat/rooms/create-for-user
 * Admin bir kullanıcı adına sesli oda oluşturur.
 * body: { userId, name, description?, icon?, roomType? }
 */
export async function POST(req: NextRequest) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })

  try {
    const { userId, name, description, icon, roomType } = await req.json()
    if (!userId || !name) {
      return NextResponse.json({ error: 'userId ve name zorunlu' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

    let baseSlug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 50)
    if (!baseSlug) baseSlug = 'oda'
    let slug = baseSlug
    let counter = 1
    while (await prisma.chatRoom.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const room = await prisma.chatRoom.create({
      data: {
        slug,
        nameEn: name,
        nameTr: name,
        descEn: description || '',
        descTr: description || '',
        icon: icon || '💬',
        ownerId: userId,
        isActive: true,
        roomType: ['FREE', 'NORMAL', 'VIP'].includes(roomType) ? roomType : 'FREE',
      },
    })

    return NextResponse.json({ success: true, room })
  } catch (e) {
    console.error('[admin create-for-user]', e)
    return NextResponse.json({ error: 'Oda oluşturulamadı' }, { status: 500 })
  }
}
