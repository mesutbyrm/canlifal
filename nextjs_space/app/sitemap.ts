import { MetadataRoute } from 'next'
import prisma from '@/lib/db'
import { BLOG_POSTS, SEO_PAGES } from '@/lib/seo-config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'
  
  // Static pages - Turkish only, clean URLs without /tr/ prefix
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/fortunes`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/social`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/chat`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
  ]

  // Fortune types pages
  const fortuneTypes = [
    'coffee', 'tarot', 'dream', 'horoscope', 'palm', 'angel',
    'numerology', 'aura', 'birthchart', 'istikhara', 'katina',
    'kursundokme', 'yesno', 'love'
  ]
  
  const fortunePages: MetadataRoute.Sitemap = fortuneTypes.map(type => ({
    url: `${baseUrl}/fortunes/${type}`,
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

  // Blog pages
  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Blog index
  const blogIndex: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
  ]

  // SEO landing pages
  const seoPages: MetadataRoute.Sitemap = SEO_PAGES.map(page => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Phase 3 pages
  const phase3Pages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/ruya-sozlugu`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/ruya-takvimi`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${baseUrl}/ruya-yarismasi`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/burc-uyumu`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/astroloji-paneli`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.7 },
  ]

  // Dream symbol pages
  let dreamSymbolPages: MetadataRoute.Sitemap = []
  try {
    const symbols = await prisma.dreamSymbol.findMany({
      select: { slug: true, updatedAt: true },
      take: 500
    })
    dreamSymbolPages = symbols.map((s: any) => ({
      url: `${baseUrl}/ruya-sozlugu/${s.slug}`,
      lastModified: s.updatedAt || new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch (e) {
    console.error('Error fetching dream symbols for sitemap:', e)
  }

  return [...staticPages, ...fortunePages, ...blogIndex, ...blogPages, ...seoPages, ...socialPostPages, ...phase3Pages, ...dreamSymbolPages]
}