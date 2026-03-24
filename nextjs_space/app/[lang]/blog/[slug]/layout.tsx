import type { Metadata } from 'next'
import { SITE_NAME } from '@/lib/seo-config'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const DEFAULT_OG_IMAGE = 'https://canlifal.com/hero_background.jpg'

interface LayoutProps {
  params: { lang: string; slug: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = params

  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug, isPublished: true },
      select: {
        titleTr: true,
        descTr: true,
        metaDescription: true,
        coverImage: true,
        keywords: true,
        slug: true,
        authorName: true,
        publishedAt: true,
        updatedAt: true,
        category: true,
      },
    })

    if (!post) {
      return {
        title: `Blog Yazısı Bulunamadı | ${SITE_NAME}`,
        robots: { index: false, follow: false },
      }
    }

    const siteUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'
    const title = `${post.titleTr} | ${SITE_NAME}`
    const description = post.metaDescription || post.descTr || ''
    const ogImage = post.coverImage || DEFAULT_OG_IMAGE
    const canonicalUrl = `${siteUrl}/blog/${post.slug}`

    return {
      title,
      description,
      keywords: post.keywords,
      authors: [{ name: post.authorName || SITE_NAME }],
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: post.titleTr,
        description,
        url: canonicalUrl,
        siteName: SITE_NAME,
        type: 'article',
        publishedTime: post.publishedAt?.toISOString(),
        modifiedTime: post.updatedAt?.toISOString(),
        section: post.category,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: post.titleTr,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.titleTr,
        description,
        images: [ogImage],
      },
      robots: {
        index: true,
        follow: true,
      },
    }
  } catch (error) {
    console.error('Blog metadata generation error:', error)
    return {
      title: `Blog | ${SITE_NAME}`,
    }
  }
}

export default function BlogSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
