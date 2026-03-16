import { MetadataRoute } from 'next'
import prisma from '@/lib/db'
import { BLOG_POSTS, SEO_PAGES } from '@/lib/seo-config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/tr`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/tr/fortunes`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en/fortunes`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tr/social`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/en/social`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tr/chat`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/en/chat`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tr/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/en/leaderboard`,
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
  
  const fortunePages: MetadataRoute.Sitemap = fortuneTypes.flatMap(type => [
    {
      url: `${baseUrl}/tr/fortunes/${type}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/en/fortunes/${type}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
  ])

  // Dynamic social posts (shared fortunes) - fetch recent public posts
  let socialPostPages: MetadataRoute.Sitemap = []
  
  try {
    const posts = await prisma.socialPost.findMany({
      where: { isPublic: true },
      select: { id: true, updatedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500 // Limit to most recent 500 posts for sitemap
    })

    socialPostPages = posts.flatMap((post: any) => [
      {
        url: `${baseUrl}/tr/fal/${post.id}`,
        lastModified: post.updatedAt || post.createdAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      },
      {
        url: `${baseUrl}/en/fal/${post.id}`,
        lastModified: post.updatedAt || post.createdAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      },
    ])
  } catch (error) {
    console.error('Error fetching posts for sitemap:', error)
  }

  // Blog pages
  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS.flatMap(post => [
    {
      url: `${baseUrl}/tr/blog/${post.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/en/blog/${post.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ])

  // Blog index
  const blogIndex: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/tr/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/en/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
  ]

  // SEO landing pages
  const seoPages: MetadataRoute.Sitemap = SEO_PAGES.flatMap(page => [
    {
      url: `${baseUrl}/tr/${page.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/en/${page.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
  ])

  return [...staticPages, ...fortunePages, ...blogIndex, ...blogPages, ...seoPages, ...socialPostPages]
}
