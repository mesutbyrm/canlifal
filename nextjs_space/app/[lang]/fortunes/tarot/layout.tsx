import type { Metadata } from 'next'
import { FORTUNE_SEO, SITE_NAME, SITE_URL } from '@/lib/seo-config'

const seo = FORTUNE_SEO.tarot

export const metadata: Metadata = {
  title: seo.titleTr,
  description: seo.descTr,
  keywords: seo.keywords,
  alternates: {
    canonical: `${SITE_URL}/fortunes/tarot`,
  },
  openGraph: {
    title: seo.titleTr,
    description: seo.descTr,
    url: `${SITE_URL}/fortunes/tarot`,
    siteName: SITE_NAME,
    images: [{ url: `${SITE_URL}/fortunes/tarot.jpg`, width: 800, height: 600, alt: seo.titleTr }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: seo.titleTr,
    description: seo.descTr,
    images: [`${SITE_URL}/fortunes/tarot.jpg`],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
