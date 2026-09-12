export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

const ALLOWED_ROLES = ['admin', 'yonetici', 'moderator']

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// GET - fetch all categories
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'content.media.upload', ALLOWED_ROLES))) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const categories = await prisma.tikTokCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { videos: true } } },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('TikTok categories fetch error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// POST - create category
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'content.media.upload', ALLOWED_ROLES))) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const { title, description } = await req.json()
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Kategori adı gerekli' }, { status: 400 })
    }

    const slug = slugify(title.trim())
    const existing = await prisma.tikTokCategory.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'Bu isimde bir kategori zaten var' }, { status: 409 })
    }

    const category = await prisma.tikTokCategory.create({
      data: { title: title.trim(), slug, description: description || null },
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('TikTok category create error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// PATCH - update category
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'content.media.upload', ALLOWED_ROLES))) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const { id, title, description, isActive, sortOrder } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

    const updateData: any = {}
    if (title) { updateData.title = title.trim(); updateData.slug = slugify(title.trim()) }
    if (description !== undefined) updateData.description = description || null
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (typeof sortOrder === 'number') updateData.sortOrder = sortOrder

    const category = await prisma.tikTokCategory.update({ where: { id }, data: updateData })
    return NextResponse.json({ category })
  } catch (error) {
    console.error('TikTok category update error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// DELETE - remove category
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'content.media.upload', ALLOWED_ROLES))) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

    // Set videos in this category to null categoryId
    await prisma.tikTokVideo.updateMany({ where: { categoryId: id }, data: { categoryId: null } })
    await prisma.tikTokCategory.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('TikTok category delete error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
