import type { Metadata } from 'next'
import { FORTUNE_SEO, SITE_NAME, SITE_URL } from '@/lib/seo-config'

const seo = FORTUNE_SEO.istikhara

export const metadata: Metadata = {
  title: seo.titleTr,
  description: seo.descTr,
  keywords: seo.keywords,
  alternates: {
    canonical: `${SITE_URL}/tr/fortunes/istikhara`,
    languages: { 'tr': '/tr/fortunes/istikhara', 'en': '/en/fortunes/istikhara' },
  },
  openGraph: {
    title: seo.titleTr,
    description: seo.descTr,
    url: `${SITE_URL}/tr/fortunes/istikhara`,
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: seo.titleTr, description: seo.descTr },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
