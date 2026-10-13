import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { atomicDebitCredits, atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getCachedPlatformSetting } from '@/lib/cache'
import { requireFeature } from '@/lib/check-feature'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { parseJetonSource, resolveJetonSpend } from '@/lib/jeton-source'

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
    const roomBlocked = await requireFeature('VOICE_ROOM_ENABLED')
    if (roomBlocked) return roomBlocked

    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const rateLimited = await guardRateLimit(req, 'room_create', { userId: authUser.id })
    if (rateLimited) return rateLimited

    const { name, description, icon, paymentType, roomType: requestedRoomType, jetonSource } = await req.json()
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

    const isStaff = user.role === 'yonetici'

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
        const createPlan = await resolveJetonSpend(user.id, cost, parseJetonSource(jetonSource))
        await atomicDebitJeton(prisma, user.id, cost, createPlan.source)
        if (createPlan.countsAsFinance) await prisma.jetonTransaction.create({
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
        await atomicDebitCredits(prisma, user.id, cost)
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
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz bakiye', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Room creation error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
