import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getCachedPlatformSetting } from '@/lib/cache'

export const dynamic = 'force-dynamic'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 50)
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { name, description, icon, paymentType, roomType: requestedRoomType } = await req.json()
    // paymentType: 'jeton' or 'cfc'

    if (!name || !description || !icon) {
      return NextResponse.json({ error: 'Name, description and icon are required' }, { status: 400 })
    }

    if (!paymentType || !['jeton', 'cfc'].includes(paymentType)) {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 })
    }

    // Get creation cost (cached)
    const costStr = await getCachedPlatformSetting('chat_room_creation_cost', '100')
    const cost = parseInt(costStr)

    // Get user balance
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, credits: true, jetonBalance: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const isStaff = user.role === 'admin' || user.role === 'yonetici'

    // Check balance (staff skip)
    if (!isStaff) {
      if (paymentType === 'jeton') {
        if ((user.jetonBalance ?? 0) < cost) {
          return NextResponse.json({ error: 'insufficient_jeton', message: 'Yetersiz jeton bakiyesi' }, { status: 400 })
        }
      } else {
        if ((user.credits ?? 0) < cost) {
          return NextResponse.json({ error: 'insufficient_cfc', message: 'Yetersiz CFC bakiyesi' }, { status: 400 })
        }
      }
    }

    // Generate unique slug
    let baseSlug = slugify(name)
    if (!baseSlug) baseSlug = 'oda'
    let slug = baseSlug
    let counter = 1
    while (await prisma.chatRoom.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Deduct balance and create room (staff skip payment)
    if (!isStaff) {
      if (paymentType === 'jeton') {
        await prisma.user.update({
          where: { id: user.id },
          data: { jetonBalance: { decrement: cost } }
        })
        await prisma.jetonTransaction.create({
          data: {
            userId: user.id,
            amount: -cost,
            type: 'spend',
            description: `Sohbet odası oluşturma: ${name}`,
            balanceBefore: user.jetonBalance ?? 0,
            balanceAfter: (user.jetonBalance ?? 0) - cost
          }
        })
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { credits: { decrement: cost } }
        })
      }
    }

    // Validate room type
    const validRoomTypes = ['FREE', 'NORMAL', 'VIP']
    const roomType = validRoomTypes.includes(requestedRoomType) ? requestedRoomType : 'FREE'

    // Create the room
    const room = await prisma.chatRoom.create({
      data: {
        slug,
        nameEn: name,
        nameTr: name,
        descEn: description,
        descTr: description,
        icon: icon || '💬',
        isActive: true,
        ownerId: user.id,
        roomType
      }
    })

    return NextResponse.json({
      success: true,
      room: { id: room.id, slug: room.slug, nameTr: room.nameTr, roomType: room.roomType },
      cost,
      paymentType
    })
  } catch (error) {
    console.error('Room creation error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
