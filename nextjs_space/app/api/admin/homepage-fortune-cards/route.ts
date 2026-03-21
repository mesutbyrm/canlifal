import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user && ((session.user as any).role || '').toLowerCase() === 'admin'
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

// PATCH - update hero/ticker platform settings (supports string and JSON values)
export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    const body = await req.json()
    const { settings } = body as { settings: Record<string, any> }
    
    const allowedKeys = [
      'homepage_hero_icon', 'homepage_hero_title', 'homepage_hero_subtitle', 'homepage_hero_link',
      'homepage_hero_items', // JSON array of hero buttons
      'ticker_button_text', 'ticker_button_icon', 'ticker_button_link', 'ticker_button_visible',
      'ticker_scroll_direction', 'ticker_scroll_speed', 'ticker_bg_color', 'ticker_bg_gradient',
      'ticker_custom_texts', // JSON array of custom scroll texts with effects
      'ticker_online_display', // 'single' | 'triple' | 'hidden'
      'ticker_text_effect', // 'none' | 'glow' | 'pulse' | 'rainbow' | 'neon'
    ]
    
    for (const [key, value] of Object.entries(settings || {})) {
      if (!allowedKeys.includes(key)) continue
      const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value)
      await prisma.platformSettings.upsert({
        where: { key },
        update: { value: strVal },
        create: { key, value: strVal, description: `Homepage setting: ${key}` },
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving hero/ticker settings:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// DELETE - delete a fortune card
export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
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
