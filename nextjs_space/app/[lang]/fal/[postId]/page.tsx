import { Metadata } from 'next'
import prisma from '@/lib/db'
import { notFound } from 'next/navigation'
import FortuneDetailClient from './fortune-detail-client'

const FORTUNE_LABELS: Record<string, Record<string, string>> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Fortune Reading' },
  tarot: { tr: 'Tarot Falı', en: 'Tarot Card Reading' },
  dream: { tr: 'Rüya Yorumu', en: 'Dream Interpretation' },
  horoscope: { tr: 'Burç Yorumu', en: 'Horoscope Reading' },
  palm: { tr: 'El Falı', en: 'Palm Reading' },
  angel: { tr: 'Melek Kartları', en: 'Angel Card Reading' },
  numerology: { tr: 'Numeroloji', en: 'Numerology Reading' },
  aura: { tr: 'Aura Analizi', en: 'Aura Analysis' },
  birthchart: { tr: 'Doğum Haritası', en: 'Birth Chart Reading' },
  istikhara: { tr: 'İstihare', en: 'Istikhara Prayer' },
  katina: { tr: 'Katina Falı', en: 'Katina Fortune' },
  kursundokme: { tr: 'Kurşun Dökme', en: 'Lead Pouring Ritual' },
  yesno: { tr: 'Evet/Hayır Falı', en: 'Yes/No Oracle' },
  love: { tr: 'Aşk Falı', en: 'Love Fortune Reading' },
  text: { tr: 'Paylaşım', en: 'Post' },
  daily_horoscope: { tr: 'Günlük Burç Yorumu', en: 'Daily Horoscope' }
}

const FORTUNE_DESCRIPTIONS: Record<string, Record<string, string>> = {
  coffee: { 
    tr: 'Türk kahvesi falı ile geleceğinizi keşfedin. Fincanınızdaki sembollerin gizemli mesajlarını öğrenin.',
    en: 'Discover your future with Turkish coffee fortune reading. Learn the mysterious messages in your cup symbols.'
  },
  tarot: { 
    tr: 'Tarot kartları ile hayatınızın gizli mesajlarını keşfedin. Geçmiş, şimdi ve gelecek hakkında içgörüler edinin.',
    en: 'Discover hidden messages in your life with tarot cards. Gain insights about past, present and future.'
  },
  dream: { 
    tr: 'Rüyalarınızın anlamını keşfedin. Bilinçaltınızın size verdiği mesajları anlayın.',
    en: 'Discover the meaning of your dreams. Understand the messages from your subconscious.'
  },
  horoscope: { 
    tr: 'Burç yorumunuz ile günlük, haftalık ve aylık enerjinizi öğrenin.',
    en: 'Learn your daily, weekly and monthly energy with your horoscope reading.'
  },
  default: {
    tr: 'Mistik dünyadan size özel mesajlar. Fal ve yorumlarla geleceğinizi keşfedin.',
    en: 'Special messages from the mystical world. Discover your future with fortune readings.'
  }
}

interface PageProps {
  params: { lang: string; postId: string }
}

async function getPost(postId: string) {
  try {
    const post = await prisma.socialPost.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, image: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        likes: {
          select: { userId: true }
        },
        _count: {
          select: { comments: true, likes: true }
        }
      }
    })
    return post
  } catch (error) {
    console.error('Error fetching post:', error)
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await getPost(params.postId)
  const lang = params.lang || 'tr'
  const baseUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'
  
  if (!post) {
    return {
      title: lang === 'tr' ? 'Fal Bulunamadı | Canlifal' : 'Fortune Not Found | Canlifal',
      description: lang === 'tr' ? 'Aradığınız fal bulunamadı.' : 'The fortune you are looking for was not found.'
    }
  }

  const fortuneType = post.fortuneType || 'default'
  const fortuneLabel = FORTUNE_LABELS[fortuneType]?.[lang] || FORTUNE_LABELS['text'][lang]
  const fortuneDesc = FORTUNE_DESCRIPTIONS[fortuneType]?.[lang] || FORTUNE_DESCRIPTIONS['default'][lang]
  
  // Create a clean excerpt from content
  const contentExcerpt = post.content
    .replace(/<[^>]*>/g, '')
    .replace(/\n+/g, ' ')
    .slice(0, 160)
    .trim() + '...'

  const title = lang === 'tr' 
    ? `${fortuneLabel} - ${post.user.name} | Canlifal`
    : `${fortuneLabel} by ${post.user.name} | Canlifal`

  const description = contentExcerpt.length > 50 
    ? contentExcerpt 
    : fortuneDesc

  const ogImage = post.imageUrl || `${baseUrl}/og-fortune.jpg`
  const canonicalUrl = `${baseUrl}/${lang}/fal/${post.id}`

  return {
    title,
    description,
    keywords: [
      lang === 'tr' ? 'fal' : 'fortune',
      lang === 'tr' ? 'kahve falı' : 'coffee fortune',
      lang === 'tr' ? 'tarot' : 'tarot reading',
      lang === 'tr' ? 'burç yorumu' : 'horoscope',
      lang === 'tr' ? 'rüya tabiri' : 'dream interpretation',
      fortuneLabel,
      'Canlifal',
      'online fal',
    ].join(', '),
    authors: [{ name: post.user.name || 'Canlifal User' }],
    creator: post.user.name || 'Canlifal',
    publisher: 'Canlifal',
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'tr': `${baseUrl}/tr/fal/${post.id}`,
        'en': `${baseUrl}/en/fal/${post.id}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Falcı - Online Fal Platformu',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: fortuneLabel,
        },
      ],
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      type: 'article',
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: (post.updatedAt || post.createdAt).toISOString(),
      authors: [post.user.name || 'Canlifal User'],
      tags: [
        fortuneLabel,
        lang === 'tr' ? 'fal' : 'fortune',
        lang === 'tr' ? 'mistik' : 'mystical',
        lang === 'tr' ? 'kehanet' : 'prophecy',
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      creator: '@canlifal',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      'article:published_time': post.createdAt.toISOString(),
      'article:modified_time': (post.updatedAt || post.createdAt).toISOString(),
      'article:author': post.user.name || 'Canlifal User',
      'article:section': fortuneLabel,
    },
  }
}

export default async function FortuneDetailPage({ params }: PageProps) {
  const post = await getPost(params.postId)
  
  if (!post || !post.isPublic) {
    notFound()
  }

  const lang = params.lang || 'tr'
  const baseUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'
  const fortuneType = post.fortuneType || 'text'
  const fortuneLabel = FORTUNE_LABELS[fortuneType]?.[lang] || FORTUNE_LABELS['text'][lang]

  // JSON-LD Structured Data for Google Discover
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${fortuneLabel} - ${post.user.name}`,
    description: post.content.replace(/<[^>]*>/g, '').slice(0, 160),
    image: post.imageUrl || `${baseUrl}/og-fortune.jpg`,
    datePublished: post.createdAt.toISOString(),
    dateModified: (post.updatedAt || post.createdAt).toISOString(),
    author: {
      '@type': 'Person',
      name: post.user.name || 'Canlifal User',
      image: post.user.image,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Canlifal',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/${lang}/fal/${post.id}`,
    },
    articleSection: fortuneLabel,
    keywords: [
      lang === 'tr' ? 'fal' : 'fortune',
      fortuneLabel,
      lang === 'tr' ? 'kahve falı' : 'coffee fortune',
      lang === 'tr' ? 'tarot' : 'tarot',
      lang === 'tr' ? 'burç' : 'horoscope',
    ],
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post._count.likes,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: post._count.comments,
      },
    ],
  }

  // WebPage structured data for better SEO
  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${fortuneLabel} - ${post.user.name}`,
    description: post.content.replace(/<[^>]*>/g, '').slice(0, 160),
    url: `${baseUrl}/${lang}/fal/${post.id}`,
    inLanguage: lang === 'tr' ? 'tr-TR' : 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Canlifal',
      url: baseUrl,
    },
    about: {
      '@type': 'Thing',
      name: fortuneLabel,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: lang === 'tr' ? 'Ana Sayfa' : 'Home',
          item: `${baseUrl}/${lang}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: lang === 'tr' ? 'Paylaşımlar' : 'Posts',
          item: `${baseUrl}/${lang}/social`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: fortuneLabel,
          item: `${baseUrl}/${lang}/fal/${post.id}`,
        },
      ],
    },
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      
      <FortuneDetailClient 
        post={JSON.parse(JSON.stringify(post))} 
        lang={lang}
        fortuneLabel={fortuneLabel}
      />
    </>
  )
}
