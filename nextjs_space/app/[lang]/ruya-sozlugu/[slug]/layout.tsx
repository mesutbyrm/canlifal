import type { Metadata } from 'next'
import { SITE_NAME } from '@/lib/seo-config'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const DEFAULT_DREAM_IMAGE = 'https://canlifal.com/fortunes/dream.jpg'

interface LayoutProps {
  params: { lang: string; slug: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = params

  try {
    const symbol = await prisma.dreamSymbol.findFirst({
      where: { slug, isPublished: true },
      select: {
        name: true,
        meaning: true,
        slug: true,
        letter: true,
        relatedSymbols: true,
      },
    })

    if (!symbol) {
      return {
        title: `Rüya Sembolü Bulunamadı | ${SITE_NAME}`,
        robots: { index: false, follow: false },
      }
    }

    const siteUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'
    const title = `${symbol.name} - Rüyada ${symbol.name} Görmek Ne Anlama Gelir? | ${SITE_NAME}`
    const description = symbol.meaning
      ? `${symbol.meaning.substring(0, 155)}${symbol.meaning.length > 155 ? '...' : ''}`
      : `Rüyada ${symbol.name} görmek ne demek? ${symbol.name} rüya tabiri ve anlamı.`
    const canonicalUrl = `${siteUrl}/ruya-sozlugu/${symbol.slug}`
    const keywords = [
      `rüyada ${symbol.name.toLowerCase()} görmek`,
      `${symbol.name.toLowerCase()} rüya tabiri`,
      'rüya sözlüğü',
      'rüya tabiri',
      ...(symbol.relatedSymbols || []).map(s => `rüyada ${s.toLowerCase()} görmek`),
    ]

    return {
      title,
      description,
      keywords,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `Rüyada ${symbol.name} Görmek - Rüya Sözlüğü`,
        description,
        url: canonicalUrl,
        siteName: SITE_NAME,
        type: 'article',
        images: [
          {
            url: DEFAULT_DREAM_IMAGE,
            width: 1200,
            height: 630,
            alt: `Rüyada ${symbol.name} Görmek - Rüya Tabiri`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `Rüyada ${symbol.name} Görmek`,
        description,
        images: [DEFAULT_DREAM_IMAGE],
      },
      robots: {
        index: true,
        follow: true,
      },
    }
  } catch (error) {
    console.error('Dream symbol metadata generation error:', error)
    return {
      title: `Rüya Sözlüğü | ${SITE_NAME}`,
    }
  }
}

export default function DreamSymbolSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
