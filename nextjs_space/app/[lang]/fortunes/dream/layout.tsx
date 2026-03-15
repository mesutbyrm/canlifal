import type { Metadata } from 'next'
import { FORTUNE_SEO, SITE_NAME, SITE_URL } from '@/lib/seo-config'

const seo = FORTUNE_SEO.dream

export const metadata: Metadata = {
  title: seo.titleTr,
  description: seo.descTr,
  keywords: seo.keywords,
  alternates: {
    canonical: `${SITE_URL}/tr/fortunes/dream`,
    languages: { 'tr': '/tr/fortunes/dream', 'en': '/en/fortunes/dream' },
  },
  openGraph: {
    title: seo.titleTr,
    description: seo.descTr,
    url: `${SITE_URL}/tr/fortunes/dream`,
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: seo.titleTr, description: seo.descTr },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
