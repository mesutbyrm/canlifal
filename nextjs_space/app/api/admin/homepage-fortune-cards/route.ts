import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { invalidateCachePrefix } from '@/lib/cache'

export const dynamic = 'force-dynamic'

async function isAdmin() {
  const session = await getServerSession(authOptions)
  const role = ((session?.user as any)?.role || '').toLowerCase()
  return session?.user && ['admin', 'yonetici', 'moderator', 'finans'].includes(role)
}

// GET - list all fortune cards
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    const cards = await prisma.homepageFortuneCard.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(cards)
  } catch (error) {
    console.error('Error fetching fortune cards:', error)
    return NextResponse.json([], { status: 500 })
  }
}

// POST - create or update a fortune card
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    const body = await req.json()
    const { id, name, icon, image, href, isActive, sortOrder } = body

    if (id) {
      // Update existing
      const updated = await prisma.homepageFortuneCard.update({
        where: { id },
        data: {
          name: name || undefined,
          icon: icon || undefined,
          image: image !== undefined ? image : undefined,
          href: href || undefined,
          isActive: isActive !== undefined ? isActive : undefined,
          sortOrder: sortOrder !== undefined ? sortOrder : undefined,
        },
      })
      return NextResponse.json(updated)
    } else {
      // Create new
      const count = await prisma.homepageFortuneCard.count()
      const created = await prisma.homepageFortuneCard.create({
        data: {
          name: name || 'Yeni Fal',
          icon: icon || '🔮',
          image: image || '',
          href: href || '/fallar',
          isActive: isActive !== undefined ? isActive : true,
          sortOrder: sortOrder !== undefined ? sortOrder : count,
        },
      })
      return NextResponse.json(created)
    }
  } catch (error) {
    console.error('Error saving fortune card:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// PUT - update an existing fortune card
export async function PUT(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.image !== undefined) updateData.image = data.image
    if (data.href !== undefined) updateData.href = data.href
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    const updated = await prisma.homepageFortuneCard.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating fortune card:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// PATCH - update hero/ticker platform settings
// Accepts either { key, value } (single setting) or { settings: { key: value, ... } } (batch)
export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    const body = await req.json()

    const allowedKeys = [
      'homepage_hero_visible', 'homepage_hero_icon', 'homepage_hero_title', 'homepage_hero_subtitle', 'homepage_hero_link',
      'homepage_hero_items',
      'ticker_button_text', 'ticker_button_icon', 'ticker_button_link', 'ticker_button_visible',
      'ticker_scroll_direction', 'ticker_scroll_speed', 'ticker_bg_color', 'ticker_bg_gradient',
      'ticker_custom_texts',
      'ticker_online_display',
      'ticker_text_effect',
    ]

    // Build a settings map from either format
    let settingsMap: Record<string, any> = {}
    if (body.settings && typeof body.settings === 'object') {
      settingsMap = body.settings
    } else if (body.key) {
      settingsMap[body.key] = body.value
    }

    for (const [key, value] of Object.entries(settingsMap)) {
      if (!allowedKeys.includes(key)) continue
      const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value)
      await prisma.platformSettings.upsert({
        where: { key },
        update: { value: strVal },
        create: { key, value: strVal, description: `Homepage setting: ${key}` },
      })
    }
    invalidateCachePrefix('platform:')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving hero/ticker settings:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// DELETE - delete a fortune card (accepts body { id } or query param ?id=)
export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    let id: string | null = null
    // Try body first
    try {
      const body = await req.json()
      id = body.id || null
    } catch {
      // No body, try query params
    }
    if (!id) {
      const { searchParams } = new URL(req.url)
      id = searchParams.get('id')
    }
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    await prisma.homepageFortuneCard.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting fortune card:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
