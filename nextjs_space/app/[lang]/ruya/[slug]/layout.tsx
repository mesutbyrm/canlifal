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
    const dream = await prisma.dreamInterpretation.findFirst({
      where: { slug, isPublished: true },
      select: {
        title: true,
        summary: true,
        metaDescription: true,
        keywords: true,
        slug: true,
        category: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!dream) {
      return {
        title: `Rüya Tabiri Bulunamadı | ${SITE_NAME}`,
        robots: { index: false, follow: false },
      }
    }

    const siteUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'
    const title = `${dream.title} - Rüya Tabiri | ${SITE_NAME}`
    const description = dream.metaDescription || dream.summary || `${dream.title} rüya tabiri ve yorumu. İslami, psikolojik ve geleneksel kaynaklara göre detaylı rüya yorumu.`
    const canonicalUrl = `${siteUrl}/ruya/${dream.slug}`

    return {
      title,
      description,
      keywords: dream.keywords,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: dream.title,
        description,
        url: canonicalUrl,
        siteName: SITE_NAME,
        type: 'article',
        publishedTime: dream.createdAt?.toISOString(),
        modifiedTime: dream.updatedAt?.toISOString(),
        section: dream.category,
        images: [
          {
            url: DEFAULT_DREAM_IMAGE,
            width: 1200,
            height: 630,
            alt: `${dream.title} - Rüya Tabiri`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${dream.title} - Rüya Tabiri`,
        description,
        images: [DEFAULT_DREAM_IMAGE],
      },
      robots: {
        index: true,
        follow: true,
      },
    }
  } catch (error) {
    console.error('Dream metadata generation error:', error)
    return {
      title: `Rüya Tabiri | ${SITE_NAME}`,
    }
  }
}

export default function DreamSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
