import { Metadata } from 'next'
import prisma from '@/lib/db'

interface LayoutProps {
  params: { lang: string; username: string }
  children: React.ReactNode
}

async function getUser(username: string) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: username },
          { username: username.toLowerCase() }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        zodiacSign: true,
        createdAt: true,
        _count: {
          select: {
            socialPosts: true
          }
        }
      }
    })
    return user
  } catch (error) {
    console.error('Error fetching user for metadata:', error)
    return null
  }
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const user = await getUser(params.username)
  const lang = params.lang || 'tr'
  const baseUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'

  if (!user) {
    return {
      title: lang === 'tr' ? 'Kullanıcı Bulunamadı | Canlifal' : 'User Not Found | Canlifal',
      description: lang === 'tr' ? 'Aradığınız kullanıcı bulunamadı.' : 'The user you are looking for was not found.'
    }
  }

  const displayUsername = user.username || user.id
  const canonicalUrl = `${baseUrl}/profil/${displayUsername}`
  const ogImage = user.image || `${baseUrl}/og-profile.jpg`

  const title = lang === 'tr'
    ? `${user.name} (@${displayUsername}) | Canlifal`
    : `${user.name} (@${displayUsername}) | Canlifal`

  const description = lang === 'tr'
    ? `${user.name} - ${user._count.socialPosts} paylaşım. Canlifal platformunda fallarını keşfet.`
    : `${user.name} - ${user._count.socialPosts} posts. Discover fortunes on Canlifal platform.`

  return {
    title,
    description,
    keywords: [
      user.name,
      displayUsername,
      lang === 'tr' ? 'fal' : 'fortune',
      lang === 'tr' ? 'falcı' : 'fortune teller',
      lang === 'tr' ? 'profil' : 'profile',
      'Canlifal',
    ].join(', '),
    authors: [{ name: user.name }],
    creator: user.name,
    publisher: 'Canlifal',
    alternates: {
      canonical: canonicalUrl,

    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Canlifal - Online Fal Platformu',
      images: [
        {
          url: ogImage,
          width: 400,
          height: 400,
          alt: user.name,
        },
      ],
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      type: 'profile',
    },
    twitter: {
      card: 'summary',
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
      // Google Discover compatibility
      'article:author': user.name,
    },
  }
}

export default function ProfileLayout({ children }: LayoutProps) {
  return <>{children}</>
}
