import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { slugifyTurkish } from '@/lib/dream-utils'

export const dynamic = 'force-dynamic'

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user && ((session.user as any).role || '').toLowerCase() === 'admin'
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = 20
    const skip = (page - 1) * limit

    const category = searchParams.get('category')?.trim() || ''
    const publishFilter = searchParams.get('publish')?.trim() || ''

    const where: any = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { keywords: { hasSome: [search] } },
      ]
    }
    if (category && category !== 'all') {
      where.category = category
    }
    if (publishFilter === 'published') {
      where.isPublished = true
    } else if (publishFilter === 'draft') {
      where.isPublished = false
    }

    const [dreams, total] = await Promise.all([
      prisma.dreamInterpretation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.dreamInterpretation.count({ where }),
    ])

    // Get category counts and publish counts
    const [publishedCount, draftCount, categoryCounts] = await Promise.all([
      prisma.dreamInterpretation.count({ where: { isPublished: true } }),
      prisma.dreamInterpretation.count({ where: { isPublished: false } }),
      prisma.dreamInterpretation.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
    ])

    const categoryCountMap: Record<string, number> = {}
    categoryCounts.forEach((c: any) => {
      categoryCountMap[c.category || 'genel'] = c._count.id
    })

    return NextResponse.json({
      dreams, total, page,
      totalPages: Math.ceil(total / limit),
      publishedCount, draftCount,
      categoryCounts: categoryCountMap,
    })
  } catch (error) {
    console.error('Admin dreams fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })

    const body = await req.json()
    const { title, content, summary, keywords, metaDescription, category, isPublished } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Başlık ve içerik zorunlu' }, { status: 400 })
    }

    // Check for duplicate title (case-insensitive)
    const existingByTitle = await prisma.dreamInterpretation.findFirst({
      where: { title: { equals: title, mode: 'insensitive' } },
    })
    if (existingByTitle) {
      return NextResponse.json({ error: 'Bu başlıkta bir rüya tabiri zaten mevcut' }, { status: 409 })
    }

    const slug = slugifyTurkish(title)

    const dream = await prisma.dreamInterpretation.create({
      data: {
        title,
        slug,
        content,
        summary: summary || '',
        keywords: keywords || [],
        metaDescription: metaDescription || '',
        category: category || 'genel',
        isPublished: isPublished !== false,
        isAiGenerated: false,
      },
    })

    return NextResponse.json({ dream })
  } catch (error: any) {
    console.error('Admin dream create error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })

    const body = await req.json()
    const { id, title, content, summary, keywords, metaDescription, category, isPublished } = body

    if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

    const data: any = {}
    if (title !== undefined) { data.title = title; data.slug = slugifyTurkish(title) }
    if (content !== undefined) data.content = content
    if (summary !== undefined) data.summary = summary
    if (keywords !== undefined) data.keywords = keywords
    if (metaDescription !== undefined) data.metaDescription = metaDescription
    if (category !== undefined) data.category = category
    if (isPublished !== undefined) data.isPublished = isPublished

    const dream = await prisma.dreamInterpretation.update({ where: { id }, data })
    return NextResponse.json({ dream })
  } catch (error: any) {
    console.error('Admin dream update error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

    await prisma.dreamInterpretation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin dream delete error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
