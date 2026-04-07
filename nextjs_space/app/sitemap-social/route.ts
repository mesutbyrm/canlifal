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

  let postEntries: string[] = []
  let tellerEntries: string[] = []
  let chatRoomEntries: string[] = []
  let gameEntries: string[] = []
  let sitePageEntries: string[] = []

  // Social posts (shared fortunes)
  try {
    const posts = await prisma.socialPost.findMany({
      where: { isPublic: true },
      select: { id: true, updatedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    })
    postEntries = posts.map((p: any) => {
      const lastmod = (p.updatedAt || p.createdAt || new Date()).toISOString()
      return `  <url>\n    <loc>${baseUrl}/fal/${escapeXml(p.id)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`
    })
  } catch (e) {
    console.error('Sitemap social posts error:', e)
  }

  // Fortune teller profiles
  try {
    const tellers = await prisma.liveFortuneTeller.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
    })
    tellerEntries = tellers.map((t: any) => {
      const lastmod = (t.updatedAt || new Date()).toISOString()
      return `  <url>\n    <loc>${baseUrl}/canli-falcilar/${escapeXml(t.id)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    })
  } catch (e) {
    console.error('Sitemap tellers error:', e)
  }

  // Chat rooms
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: { isActive: true },
      select: { slug: true },
    })
    chatRoomEntries = rooms.map((r: any) =>
      `  <url>\n    <loc>${baseUrl}/sohbet/${escapeXml(r.slug)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.6</priority>\n  </url>`
    )
  } catch (e) {
    console.error('Sitemap chat rooms error:', e)
  }

  // Mini games
  try {
    const games = await prisma.miniGame.findMany({
      where: { isActive: true },
      select: { slug: true },
    })
    gameEntries = games.map((g: any) =>
      `  <url>\n    <loc>${baseUrl}/oyunlar/${escapeXml(g.slug)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`
    )
  } catch (e) {
    console.error('Sitemap games error:', e)
  }

  // Site pages (hakkimizda, gizlilik, etc.)
  try {
    const pages = await prisma.sitePage.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    })
    sitePageEntries = pages.map((p: any) => {
      const lastmod = (p.updatedAt || new Date()).toISOString()
      return `  <url>\n    <loc>${baseUrl}/sayfa/${escapeXml(p.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.4</priority>\n  </url>`
    })
  } catch (e) {
    console.error('Sitemap site pages error:', e)
  }

  // Game pages (static individual game routes)
  const gameRoutes = [
    'amiral-batti', 'connect4', 'dama', 'gomoku', 'kart-eslestirme-pvp',
    'kelime-duellosu', 'mangala', 'okey', 'okey101', 'pisti', 'quiz-1v1',
    'reversi', 'sayi-tahmin', 'sos', 'tas-kagit-makas', 'tavla', 'tombala',
    'xox', 'yuzbirokey', 'zar'
  ]
  const staticGameEntries = gameRoutes.map(slug =>
    `  <url>\n    <loc>${baseUrl}/oyunlar/${slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/sosyal</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/sohbet</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/sohbet/video</loc>
    <changefreq>hourly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/canli-falcilar</loc>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${baseUrl}/oyunlar</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/siralama</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
${tellerEntries.join('\n')}
${chatRoomEntries.join('\n')}
${[...gameEntries, ...staticGameEntries].join('\n')}
${sitePageEntries.join('\n')}
${postEntries.join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
