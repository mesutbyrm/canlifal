import type { Metadata } from 'next'
import { Inter, Cinzel } from 'next/font/google'
import './globals.css'
import SessionProviderWrapper from '@/components/session-provider-wrapper'
import { LanguageProvider } from '@/lib/language-context'
import SiteThemeWrapper from '@/components/site-theme-wrapper'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: {
    default: 'FALCI - Yapay Zeka Fal Platformu | Online Kahve Falı, Tarot, Burç Yorumu',
    template: '%s | Falcı'
  },
  description: 'Yapay zeka destekli ücretsiz online fal platformu. Kahve Falı, Tarot, Burç Yorumu, Rüya Tabiri, El Falı ve daha fazlası. Geleceğinizi keşfedin!',
  keywords: [
    'fal', 'kahve falı', 'tarot', 'burç yorumu', 'rüya tabiri', 'el falı',
    'online fal', 'ücretsiz fal', 'yapay zeka fal', 'günlük burç',
    'aşk falı', 'melek kartları', 'numeroloji', 'astroloji',
    'fortune telling', 'coffee reading', 'horoscope', 'tarot reading'
  ],
  authors: [{ name: 'Falcı', url: 'https://falci.kulaktan.com' }],
  creator: 'Falcı',
  publisher: 'Falcı',
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
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192x192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    alternateLocale: 'en_US',
    siteName: 'Falcı - Online Fal Platformu',
    title: 'FALCI - Yapay Zeka Fal Platformu',
    description: 'Yapay zeka destekli ücretsiz online fal platformu. Kahve Falı, Tarot, Burç Yorumu ve daha fazlası.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Falcı - Online Fal Platformu',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FALCI - Yapay Zeka Fal Platformu',
    description: 'Yapay zeka destekli ücretsiz online fal platformu. Geleceğinizi keşfedin!',
    images: ['/og-image.png'],
    creator: '@falciapp',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
  },
  alternates: {
    canonical: process.env.NEXTAUTH_URL || 'https://falci.kulaktan.com',
    languages: {
      'tr': '/tr',
      'en': '/en',
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FALCI',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'application-name': 'FALCI',
    'apple-mobile-web-app-title': 'FALCI',
    'msapplication-TileColor': '#0a0118',
    'msapplication-tap-highlight': 'no',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className={`${inter.variable} ${cinzel.variable}`}>
      <head>
        <meta name="theme-color" content="#1a0a2e" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" async />
        {/* Organization Structured Data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Falcı",
              "alternateName": "Falci Online Fal Platformu",
              "url": "https://falci.kulaktan.com",
              "logo": "https://falci.kulaktan.com/logo.png",
              "description": "Yapay zeka destekli ücretsiz online fal platformu. Kahve Falı, Tarot, Burç Yorumu ve daha fazlası.",
              "sameAs": [
                "https://twitter.com/falciapp",
                "https://facebook.com/falciapp"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": ["Turkish", "English"]
              }
            })
          }}
        />
        {/* WebSite Structured Data for Google Search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Falcı",
              "alternateName": "Falci - Online Fal Platformu",
              "url": "https://falci.kulaktan.com",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://falci.kulaktan.com/tr/social?search={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              },
              "inLanguage": ["tr", "en"]
            })
          }}
        />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function(registration) {
                  console.log('ServiceWorker registration successful');
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `
        }} />
      </head>
      <body>
        <SessionProviderWrapper>
          <SiteThemeWrapper>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </SiteThemeWrapper>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
// PostgreSQL v2 - Fixed DATABASE_URL
