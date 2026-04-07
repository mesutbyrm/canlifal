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

  let dreamEntries: string[] = []
  let symbolEntries: string[] = []

  try {
    // Dream interpretations
    const dreams = await prisma.dreamInterpretation.findMany({
      where: { isPublished: true },
      select: { slug: true, title: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    })

    dreamEntries = dreams.map((d: any) => {
      const lastmod = (d.updatedAt || new Date()).toISOString()
      return `  <url>\n    <loc>${baseUrl}/ruya/${escapeXml(d.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    })

    // Dream symbols
    const symbols = await prisma.dreamSymbol.findMany({
      where: { isPublished: true },
      select: { slug: true, name: true, updatedAt: true },
      take: 10000,
    })

    symbolEntries = symbols.map((s: any) => {
      const lastmod = (s.updatedAt || new Date()).toISOString()
      return `  <url>\n    <loc>${baseUrl}/ruya-sozlugu/${escapeXml(s.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
    })
  } catch (e) {
    console.error('Error generating dreams sitemap:', e)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/ruya</loc>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${baseUrl}/ruya-sozlugu</loc>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${baseUrl}/ruya-istatistikleri</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/ruya-trendleri</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/ruya-takvimi</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
${dreamEntries.join('\n')}
${symbolEntries.join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
