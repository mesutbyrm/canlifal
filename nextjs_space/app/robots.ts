import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://falci.kulaktan.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/settings/',
          '/dashboard/',
          '/live-room/',
          '/chat/video/broadcast/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/settings/',
          '/dashboard/',
          '/live-room/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
