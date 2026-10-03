import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getStaffSession } from '@/lib/admin-auth'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const session = await getStaffSession()
  if (!session?.user) return false
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  return user && (await staffCan(user.role, session.user.id, 'content.media.upload', ['admin', 'yonetici', 'moderator']))
}

export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const where: any = {}
    if (category && category !== 'hepsi') where.category = category

    const trends = await prisma.trendingTopic.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }]
    })

    return NextResponse.json(trends)
  } catch (error) {
    console.error('Error fetching admin trends:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id, ...data } = body

    if (id) {
      // Update existing
      const trend = await prisma.trendingTopic.update({
        where: { id },
        data: {
          title: data.title,
          slug: data.slug,
          category: data.category,
          description: data.description || null,
          image: data.image || null,
          icon: data.icon || null,
          trendScore: data.trendScore || 0,
          isActive: data.isActive ?? true,
          isPinned: data.isPinned ?? false,
          relatedUrl: data.relatedUrl || null,
          tags: data.tags || null,
          endDate: data.endDate ? new Date(data.endDate) : null,
        }
      })
      return NextResponse.json(trend)
    } else {
      // Create new
      const trend = await prisma.trendingTopic.create({
        data: {
          title: data.title,
          slug: data.slug,
          category: data.category,
          description: data.description || null,
          image: data.image || null,
          icon: data.icon || null,
          trendScore: data.trendScore || 0,
          isActive: data.isActive ?? true,
          isPinned: data.isPinned ?? false,
          relatedUrl: data.relatedUrl || null,
          tags: data.tags || null,
          endDate: data.endDate ? new Date(data.endDate) : null,
        }
      })
      return NextResponse.json(trend)
    }
  } catch (error) {
    console.error('Error saving trend:', error)
    return NextResponse.json({ error: 'Kaydetme hatası' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

    await prisma.trendingTopic.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting trend:', error)
    return NextResponse.json({ error: 'Silme hatası' }, { status: 500 })
  }
}
