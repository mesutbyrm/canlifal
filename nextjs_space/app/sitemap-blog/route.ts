import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'canlifal.com'
  const proto = headersList.get('x-forwarded-proto') || 'https'
  const baseUrl = `${proto}://${host}`

  let blogEntries: string[] = []
  let categoryEntries: string[] = []

  try {
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true, titleTr: true, coverImage: true, updatedAt: true, publishedAt: true, category: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    })

    blogEntries = posts.map((p: any) => {
      const lastmod = (p.updatedAt || p.publishedAt || new Date()).toISOString()
      const imageTag = p.coverImage
        ? `\n    <image:image>\n      <image:loc>${escapeXml(p.coverImage)}</image:loc>\n      <image:title>${escapeXml(p.titleTr)}</image:title>\n    </image:image>`
        : ''
      return `  <url>\n    <loc>${baseUrl}/blog/${escapeXml(p.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>${imageTag}\n  </url>`
    })

    // Blog categories
    const categories = await prisma.blogCategory.findMany({
      where: { isActive: true },
      select: { slug: true },
    })
    categoryEntries = categories.map((c: any) =>
      `  <url>\n    <loc>${baseUrl}/blog/kategori/${escapeXml(c.slug)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    )
  } catch (e) {
    console.error('Error generating blog sitemap:', e)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${categoryEntries.join('\n')}
${blogEntries.join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
