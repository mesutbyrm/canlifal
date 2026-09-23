import type { Metadata } from 'next'
import { FORTUNE_SEO, SITE_NAME, SITE_URL } from '@/lib/seo-config'

const seo = FORTUNE_SEO.horoscope

export const metadata: Metadata = {
  title: seo.titleTr,
  description: seo.descTr,
  keywords: seo.keywords,
  alternates: {
    canonical: `${SITE_URL}/fallar/burc-yorumu`,
  },
  openGraph: {
    title: seo.titleTr,
    description: seo.descTr,
    url: `${SITE_URL}/fallar/burc-yorumu`,
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: seo.titleTr, description: seo.descTr },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
