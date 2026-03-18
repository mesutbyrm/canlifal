import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/seo-config'

export const metadata: Metadata = {
  title: 'Rüya Tabirleri - Rüya Yorumları Ansiklopedisi | ' + SITE_NAME,
  description: 'Binlerce rüya tabiri ve yorumu. Rüyanızda gördüklerinizin anlamını İslami, psikolojik ve geleneksel yorumlarla keşfedin.',
  keywords: ['rüya tabiri', 'rüya yorumu', 'rüyada görmek', 'rüya ansiklopedisi', 'islami rüya tabiri', 'diyanet rüya tabiri'],
  alternates: {
    canonical: `${SITE_URL}/ruya`,
  },
  openGraph: {
    title: 'Rüya Tabirleri - Rüya Yorumları Ansiklopedisi | ' + SITE_NAME,
    description: 'Binlerce rüya tabiri ve yorumu. Rüyanızda gördüklerinizin anlamını İslami, psikolojik ve geleneksel yorumlarla keşfedin.',
    url: `${SITE_URL}/ruya`,
    siteName: SITE_NAME,
    type: 'website',
  },
}

export default function RuyaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
