import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION_TR } from '@/lib/seo-config'

export const metadata: Metadata = {
  title: 'Blog - Fal ve Astroloji Yazıları',
  description: 'Kahve falı, tarot, burç yorumları ve daha fazlası hakkında bilgilendirici yazılar. Fal dünyasının sırlarını keşfedin.',
  keywords: ['fal blog', 'astroloji yazıları', 'kahve falı rehber', 'tarot rehber', 'burç yorumları'],
  alternates: {
    canonical: `${SITE_URL}/tr/blog`,
    languages: { 'tr': '/tr/blog', 'en': '/en/blog' },
  },
  openGraph: {
    title: 'Blog - Fal ve Astroloji Yazıları | ' + SITE_NAME,
    description: 'Kahve falı, tarot, burç yorumları ve daha fazlası hakkında bilgilendirici yazılar.',
    url: `${SITE_URL}/tr/blog`,
    siteName: SITE_NAME,
    type: 'website',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
