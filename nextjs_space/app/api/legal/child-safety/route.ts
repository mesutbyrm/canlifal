import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Public endpoint for child safety policy.
 * Google Play requires a publicly accessible web resource that explicitly
 * prohibits CSAE. This endpoint returns the policy in both HTML and
 * structured JSON so Flutter and web clients can consume it.
 */
export async function GET() {
  try {
    const page = await prisma.sitePage.findUnique({
      where: { slug: 'cocuk-guvenligi-politikasi', isPublished: true },
      select: { title: true, slug: true, content: true, updatedAt: true }
    })

    if (!page) {
      return NextResponse.json(
        { error: 'Child safety policy not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      title: page.title,
      slug: page.slug,
      content: page.content,
      updatedAt: page.updatedAt,
      webUrl: '/sayfa/cocuk-guvenligi-politikasi',
      contactEmail: 'guvenlik@canlifal.com'
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('Child safety policy error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
