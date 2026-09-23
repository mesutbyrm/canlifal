import { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

// Sitemap index that references all sub-sitemaps
export default function sitemap(): MetadataRoute.Sitemap {
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'canlifal.com'
  const proto = headersList.get('x-forwarded-proto') || 'https'
  const baseUrl = `${proto}://${host}`

  // Return a comprehensive list of ALL static pages
  // Dynamic content (blog, dreams, social posts, tellers, games) are in separate sitemap routes
  const now = new Date()

  return [
    // Homepage
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    // Fortune pages
    { url: `${baseUrl}/fallar`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/fallar/kahve-fali`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/fallar/tarot-fali`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/fallar/el-fali`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/fallar/ruya-yorumu`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/fallar/ask-uyumu`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/fallar/burc-yorumu`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/fallar/numeroloji`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/fallar/melek-kartlari`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/fallar/aura-analizi`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/fallar/dogum-haritasi`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/fallar/katina`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/fallar/evet-hayir`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/fallar/kursundokme`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/fallar/istihare`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    // Blog
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/blog/burclar`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    // Dream
    { url: `${baseUrl}/ruya`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/ruya-sozlugu`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/ruya-istatistikleri`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/ruya-trendleri`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/ruya-takvimi`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/ruya-yarismasi`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    // Social & Community
    { url: `${baseUrl}/sosyal`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${baseUrl}/sohbet`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/sohbet/video`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${baseUrl}/siralama`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    // Live fortune tellers
    { url: `${baseUrl}/canli-falcilar`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/en-iyi-falcilar`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/canli-tarot`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/canli-kahve-fali`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/online-fal`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/falci-ol`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    // Astrology
    { url: `${baseUrl}/burc-uyumu`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/astroloji-paneli`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    // Games
    { url: `${baseUrl}/oyunlar`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    // Membership & Other
    { url: `${baseUrl}/uyelik`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/jeton`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/hediyeler`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/basarimlar`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/davet`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/iletisim`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
