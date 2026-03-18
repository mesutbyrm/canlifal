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
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = 20
    const skip = (page - 1) * limit

    const where: any = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
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

    return NextResponse.json({ dreams, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Admin dreams fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { title, content, summary, keywords, metaDescription, isPublished } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Başlık ve içerik zorunlu' }, { status: 400 })
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
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, title, content, summary, keywords, metaDescription, isPublished } = body

    if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

    const data: any = {}
    if (title !== undefined) { data.title = title; data.slug = slugifyTurkish(title) }
    if (content !== undefined) data.content = content
    if (summary !== undefined) data.summary = summary
    if (keywords !== undefined) data.keywords = keywords
    if (metaDescription !== undefined) data.metaDescription = metaDescription
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
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
