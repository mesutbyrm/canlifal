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
  const baseUrl = process.env.NEXTAUTH_URL || 'https://falci.kulaktan.com'

  if (!user) {
    return {
      title: lang === 'tr' ? 'Kullanıcı Bulunamadı | Falcı' : 'User Not Found | Falci',
      description: lang === 'tr' ? 'Aradığınız kullanıcı bulunamadı.' : 'The user you are looking for was not found.'
    }
  }

  const displayUsername = user.username || user.id
  const canonicalUrl = `${baseUrl}/${lang}/profile/${displayUsername}`
  const ogImage = user.image || `${baseUrl}/og-profile.jpg`

  const title = lang === 'tr'
    ? `${user.name} (@${displayUsername}) | Falcı`
    : `${user.name} (@${displayUsername}) | Falci`

  const description = lang === 'tr'
    ? `${user.name} - ${user._count.socialPosts} paylaşım. Falcı platformunda fallarını keşfet.`
    : `${user.name} - ${user._count.socialPosts} posts. Discover fortunes on Falci platform.`

  return {
    title,
    description,
    keywords: [
      user.name,
      displayUsername,
      lang === 'tr' ? 'fal' : 'fortune',
      lang === 'tr' ? 'falcı' : 'fortune teller',
      lang === 'tr' ? 'profil' : 'profile',
      'Falcı',
    ].join(', '),
    authors: [{ name: user.name }],
    creator: user.name,
    publisher: 'Falcı',
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'tr': `${baseUrl}/tr/profile/${displayUsername}`,
        'en': `${baseUrl}/en/profile/${displayUsername}`,
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
      creator: '@falciapp',
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
