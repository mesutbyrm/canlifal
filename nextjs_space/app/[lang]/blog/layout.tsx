import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/seo-config'

export const metadata: Metadata = {
  title: `Blog - Güncel Haberler, Rehberler ve İpuçları | ${SITE_NAME}`,
  description: 'Teknoloji, sağlık, moda, seyahat, yemek tarifleri, astroloji ve daha fazlası hakkında SEO uyumlu, güncel ve bilgilendirici blog yazıları.',
  keywords: ['blog', 'teknoloji', 'sağlık', 'moda', 'yemek tarifleri', 'seyahat', 'astroloji', 'psikoloji', 'oyun', 'film', 'kitap'],
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    title: `Blog | ${SITE_NAME}`,
    description: 'Güncel haberler, rehberler ve ipuçları. Her kategoriden kaliteli içerikler.',
    url: `${SITE_URL}/blog`,
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Blog | ${SITE_NAME}`,
    description: 'Güncel haberler, rehberler ve ipuçları.',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
