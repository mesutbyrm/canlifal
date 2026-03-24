import { MetadataRoute } from 'next'
import prisma from '@/lib/db'
import { SEO_PAGES } from '@/lib/seo-config'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

// Main sitemap: static pages, fortune types, social posts, chat rooms, site pages
// Blog and dream content are in separate sitemaps: /sitemap-blog and /sitemap-dreams
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'canlifal.com'
  const proto = headersList.get('x-forwarded-proto') || 'https'
  const baseUrl = `${proto}://${host}`
  
  // Static pages - Turkish only, clean URLs without /tr/ prefix
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/fallar`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sosyal`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sohbet`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/siralama`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/oyunlar`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/canli-falcilar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/online-fal`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ruya-istatistikleri`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/ruya-trendleri`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/iletisim`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Fortune types pages
  const fortuneSlugs = [
    'kahve-fali', 'tarot-fali', 'el-fali', 'ruya-yorumu', 'ask-uyumu',
    'burc-yorumu', 'numeroloji', 'melek-kartlari', 'aura-analizi',
    'dogum-haritasi', 'katina', 'evet-hayir', 'kursundokme', 'istihare'
  ]
  
  const fortunePages: MetadataRoute.Sitemap = fortuneSlugs.map(slug => ({
    url: `${baseUrl}/fallar/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Dynamic social posts (shared fortunes)
  let socialPostPages: MetadataRoute.Sitemap = []
  try {
    const posts = await prisma.socialPost.findMany({
      where: { isPublic: true },
      select: { id: true, updatedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500
    })
    socialPostPages = posts.map((post: any) => ({
      url: `${baseUrl}/fal/${post.id}`,
      lastModified: post.updatedAt || post.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch (error) {
    console.error('Error fetching posts for sitemap:', error)
  }

  // SEO landing pages
  const seoPages: MetadataRoute.Sitemap = SEO_PAGES.map(page => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Phase 3 pages
  const phase3Pages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/ruya-takvimi`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${baseUrl}/ruya-yarismasi`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/burc-uyumu`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/astroloji-paneli`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.7 },
  ]

  // Site pages (dynamic static pages like hakkimizda, gizlilik, etc.)
  let sitePages: MetadataRoute.Sitemap = []
  try {
    const pages = await prisma.sitePage.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    })
    sitePages = pages.map((p: any) => ({
      url: `${baseUrl}/sayfa/${p.slug}`,
      lastModified: p.updatedAt || new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))
  } catch (e) {
    console.error('Error fetching site pages for sitemap:', e)
  }

  // Chat rooms
  let chatRoomPages: MetadataRoute.Sitemap = []
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: { isActive: true },
      select: { slug: true },
    })
    chatRoomPages = rooms.map((r: any) => ({
      url: `${baseUrl}/sohbet/${r.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }))
  } catch (e) {
    console.error('Error fetching chat rooms for sitemap:', e)
  }

  return [
    ...staticPages,
    ...fortunePages,
    ...seoPages,
    ...socialPostPages,
    ...phase3Pages,
    ...sitePages,
    ...chatRoomPages,
  ]
}