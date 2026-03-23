import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const adminMode = searchParams.get('admin') === 'true'

    if (adminMode) {
      const session = await getServerSession(authOptions)
      if (!session?.user || (session.user as any).role !== 'admin') {
        return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
      }
      const pages = await prisma.sitePage.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
      })
      return NextResponse.json({ pages })
    }

    // Public: only published pages
    const pages = await prisma.sitePage.findMany({
      where: { isPublished: true },
      select: { id: true, title: true, titleEn: true, slug: true, showInFooter: true, showInHeader: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' }
    })
    return NextResponse.json({ pages })
  } catch (error) {
    console.error('Site pages GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { title, titleEn, slug, content, contentEn, isPublished, showInFooter, showInHeader, sortOrder } = body

    if (!title || !slug || !content) {
      return NextResponse.json({ error: 'Title, slug, and content are required' }, { status: 400 })
    }

    // Normalize slug
    const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

    // Check unique slug
    const existing = await prisma.sitePage.findUnique({ where: { slug: normalizedSlug } })
    if (existing) {
      return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 400 })
    }

    const page = await prisma.sitePage.create({
      data: {
        title,
        titleEn: titleEn || null,
        slug: normalizedSlug,
        content,
        contentEn: contentEn || null,
        isPublished: isPublished !== false,
        showInFooter: showInFooter !== false,
        showInHeader: showInHeader === true,
        sortOrder: sortOrder || 0,
      }
    })

    return NextResponse.json({ page })
  } catch (error) {
    console.error('Site pages POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    
    // Handle bulk reorder
    if (body.reorder && Array.isArray(body.items)) {
      const updates = body.items.map((item: { id: string; sortOrder: number }) =>
        prisma.sitePage.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder }
        })
      )
      await prisma.$transaction(updates)
      return NextResponse.json({ success: true })
    }

    const { id, title, titleEn, slug, content, contentEn, isPublished, showInFooter, showInHeader, sortOrder } = body

    if (!id) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (titleEn !== undefined) updateData.titleEn = titleEn
    if (slug !== undefined) {
      const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const existing = await prisma.sitePage.findFirst({ where: { slug: normalizedSlug, NOT: { id } } })
      if (existing) return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 400 })
      updateData.slug = normalizedSlug
    }
    if (content !== undefined) updateData.content = content
    if (contentEn !== undefined) updateData.contentEn = contentEn
    if (isPublished !== undefined) updateData.isPublished = isPublished
    if (showInFooter !== undefined) updateData.showInFooter = showInFooter
    if (showInHeader !== undefined) updateData.showInHeader = showInHeader
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    const page = await prisma.sitePage.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ page })
  } catch (error) {
    console.error('Site pages PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }

    await prisma.sitePage.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Site pages DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
