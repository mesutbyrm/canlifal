export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// GET - List all items for admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const items = await prisma.banaOzelItem.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Admin bana-ozel GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH - Update item
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }

    const updated = await prisma.banaOzelItem.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, item: updated })
  } catch (error) {
    console.error('Admin bana-ozel PATCH error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Create new item
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { slug, nameTr, nameEn, icon, jetonCost, category, sortOrder } = body

    if (!slug || !nameTr) {
      return NextResponse.json({ error: 'Slug ve isim gerekli' }, { status: 400 })
    }

    const created = await prisma.banaOzelItem.create({
      data: { slug, nameTr, nameEn: nameEn || nameTr, icon: icon || '🔮', jetonCost: jetonCost || 5, category: category || 'fortune', sortOrder: sortOrder || 0 },
    })

    return NextResponse.json({ success: true, item: created })
  } catch (error) {
    console.error('Admin bana-ozel POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
